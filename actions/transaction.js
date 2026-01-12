"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

// Scan Receipt Function
export async function scanReceipt(receiptFile) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (!receiptFile) {
      throw new Error("No receipt file provided");
    }

    console.log("Starting receipt scan...");
    console.log("File type:", receiptFile.type);
    console.log("File size:", receiptFile.size);

    // Convert File to base64
    const arrayBuffer = await receiptFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    console.log("Base64 conversion successful");

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const prompt = `Analyze this receipt image and extract transaction details.
Return ONLY a valid JSON object in this EXACT format:
{
  "amount": 123.45,
  "description": "Store Name",
  "date": "YYYY-MM-DD",
  "category": "Suggested Category Name"
}

Important:
- amount: must be a number (total paid amount from the receipt)
- description: store/merchant name
- date: YYYY-MM-DD format (if not visible on receipt, use today's date)
- category: Suggest a single, general category for the items on the receipt (e.g., "Groceries", "Food", "Shopping").

Return ONLY the JSON object, no markdown, no explanations, no extra text.`;

    console.log("Calling Gemini API...");

    const result = await model.generateContent([
      {
        text: prompt
      },
      {
        inlineData: {
          data: base64Data,
          mimeType: receiptFile.type || "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    let responseText = response.text();
    
    console.log("Raw Gemini response:", responseText);
    
    // Clean up markdown formatting
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^`+|`+$/g, '')
      .trim();
    
    console.log("Cleaned response:", responseText);
    
    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Failed to parse:", responseText);
      throw new Error("Invalid response from AI. Please try again.");
    }
    
    console.log("Parsed data:", parsedData);
    
    // Validate and normalize data
    if (!parsedData.amount || parsedData.amount <= 0) {
      throw new Error("Could not extract amount from receipt");
    }

    // Ensure amount is a number
    parsedData.amount = parseFloat(parsedData.amount);
    
    if (isNaN(parsedData.amount)) {
      throw new Error("Invalid amount in receipt");
    }
    
    // Set default date if not provided or invalid
    if (!parsedData.date || parsedData.date === "") {
      parsedData.date = new Date().toISOString().split('T')[0];
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(parsedData.date)) {
      parsedData.date = new Date().toISOString().split('T')[0];
    }

    // Set default description if empty
    if (!parsedData.description || parsedData.description === "") {
      parsedData.description = "Receipt Transaction";
    }

    // Category will be a suggested name, or empty string
    parsedData.category = parsedData.category || "";
    
    console.log("Final processed data:", parsedData);
    
    return { 
      success: true, 
      data: parsedData 
    };
    
  } catch (error) {
    console.error("Error scanning receipt:", error);
    console.error("Error stack:", error.stack);
    throw new Error(`Failed to scan receipt: ${error.message}`);
  }
}

// Create Transaction
export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error(error.message);
  }
}

// Get Transaction
export async function getTransaction(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    const transaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!transaction) throw new Error("Transaction not found");

    return serializeAmount(transaction);
  } catch (error) {
    console.error("Error getting transaction:", error);
    throw new Error(error.message);
  }
}

// Update Transaction
export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // Calculate balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw new Error(error.message);
  }
}

// Get User Transactions
export async function getUserTransactions(query = {}) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...query,
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error getting transactions:", error);
    throw new Error(error.message);
  }
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}