"use client";

import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { cn } from "@/lib/utils";
import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import { ReceiptScanner } from "./recipt-scanner";

export function AddTransactionForm({
  accounts,
  categories,
  editMode = false,
  initialData = null,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isProcessingScan = useRef(false);

  const defaultValues = useMemo(() => {
    return editMode && initialData
      ? {
          type: initialData.type,
          amount: initialData.amount.toString(),
          description: initialData.description,
          accountId: initialData.accountId,
          category: initialData.category,
          date: new Date(initialData.date),
          isRecurring: initialData.isRecurring,
          ...(initialData.recurringInterval && {
            recurringInterval: initialData.recurringInterval,
          }),
        }
      : {
          type: "EXPENSE",
          amount: "",
          description: "",
          accountId: accounts.find((ac) => ac.isDefault)?.id || "",
          category: "",
          date: new Date(),
          isRecurring: false,
          recurringInterval: undefined,
        };
  }, [editMode, initialData, accounts]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  const {
    loading: transactionLoading,
    fn: transactionFn,
    data: transactionResult,
  } = useFetch(editMode ? updateTransaction : createTransaction);

  const onSubmit = (data) => {
    const formData = {
      ...data,
      amount: parseFloat(data.amount),
    };

    if (editMode) {
      transactionFn(editId, formData);
    } else {
      transactionFn(formData);
    }
  };

  const handleScanComplete = (scannedData) => {
    console.log("handleScanComplete called with:", scannedData);

    if (!scannedData || isProcessingScan.current) {
      console.log("No scanned data received or already processing");
      return;
    }

    isProcessingScan.current = true;

    try {
      // Validate scannedData has required fields
      if (typeof scannedData !== 'object') {
        throw new Error("Invalid scanned data format");
      }

      // Set amount - with multiple safety checks
      if (scannedData.amount !== undefined && scannedData.amount !== null) {
        const amount = parseFloat(scannedData.amount);
        console.log("Processing amount:", amount);
        
        if (!isNaN(amount) && amount > 0) {
          setValue("amount", amount.toString());
          console.log("✓ Set amount:", amount);
        } else {
          console.warn("Invalid amount value:", scannedData.amount);
          toast.warning("Could not auto-fill amount. Please enter manually.");
        }
      } else {
        console.warn("Amount field missing from scanned data");
        toast.warning("Could not extract amount from receipt");
      }

      // Set date
      if (scannedData.date) {
        try {
          const date = new Date(scannedData.date);
          if (!isNaN(date.getTime())) {
            setValue("date", date);
            console.log("✓ Set date:", date);
          } else {
            console.warn("Invalid date:", scannedData.date);
          }
        } catch (e) {
          console.error("Date parsing error:", e);
        }
      }

      // Set description
      if (scannedData.description && scannedData.description.trim() !== "") {
        setValue("description", scannedData.description);
        console.log("✓ Set description:", scannedData.description);
      } else {
        console.warn("Description missing or empty");
      }

      // Always set type to EXPENSE for receipts first
      setValue("type", "EXPENSE");
      console.log("✓ Set type: EXPENSE");

      // Set category by matching name after a small delay to ensure type is set
      setTimeout(() => {
        if (scannedData.category && scannedData.category.trim() !== "") {
          const categoryName = scannedData.category.toLowerCase();
          const foundCategory = categories.find(
            cat => cat.name.toLowerCase() === categoryName && cat.type === "EXPENSE"
          );
          
          if (foundCategory) {
            setValue("category", foundCategory.id);
            console.log(`✓ Set category to: ${foundCategory.name}`);
          } else {
            setValue("category", "");
            console.warn(`Suggested category "${scannedData.category}" not found.`);
            toast.warning(`Could not match category "${scannedData.category}". Please select manually.`);
          }
        } else {
          setValue("category", "");
          console.warn("Category field missing or empty from scanned data");
          toast.warning("Could not extract category from receipt. Please select manually.");
        }
        
        isProcessingScan.current = false;
      }, 100);

    } catch (error) {
      console.error("Error in handleScanComplete:", error);
      toast.error("Error processing receipt data. Please enter manually.");
      isProcessingScan.current = false;
    }
  };

  useEffect(() => {
    if (transactionResult?.success && !transactionLoading) {
      toast.success(
        editMode
          ? "Transaction updated successfully"
          : "Transaction created successfully"
      );
      reset();
      router.push(`/account/${transactionResult.data.accountId}`);
    }
  }, [transactionResult, transactionLoading, editMode, reset, router]);

  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");
  const prevTypeRef = useRef(type);

  // Only clear category when type actually changes (not on mount) and we're not processing a scan
  useEffect(() => {
    if (!isProcessingScan.current && prevTypeRef.current !== type && prevTypeRef.current !== undefined) {
      setValue("category", "");
    }
    prevTypeRef.current = type;
  }, [type, setValue]);

  const filteredCategories = categories.filter(
    (category) => category.type === type
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Receipt Scanner - Only show in create mode */}
      {!editMode && (
        <div className="p-4 bg-gradient-to-br from-orange-50 to-purple-50 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium mb-3 text-purple-900">
            Quick Scan
          </h3>
          <ReceiptScanner onScanComplete={handleScanComplete} />
          <p className="text-xs text-purple-600 mt-2">
            Upload a receipt photo to auto-fill transaction details with AI
          </p>
        </div>
      )}

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select
          onValueChange={(value) => setValue("type", value)}
          value={watch("type")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Amount and Account */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Account</label>
          <Select
            onValueChange={(value) => setValue("accountId", value)}
            value={watch("accountId")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} (₹{parseFloat(account.balance).toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.accountId && (
            <p className="text-sm text-red-500">{errors.accountId.message}</p>
          )}
          <CreateAccountDrawer>
            <Button variant="ghost" className="w-full justify-start">
              Create New Account
            </Button>
          </CreateAccountDrawer>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select
          onValueChange={(value) => setValue("category", value)}
          value={watch("category")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => setValue("date", date)}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input placeholder="Enter description" {...register("description")} />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Recurring Toggle */}
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <label className="text-base font-medium">Recurring Transaction</label>
          <div className="text-sm text-muted-foreground">
            Set up a recurring schedule for this transaction
          </div>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={(checked) => setValue("isRecurring", checked)}
        />
      </div>

      {/* Recurring Interval */}
      {isRecurring && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recurring Interval</label>
          <Select
            onValueChange={(value) => setValue("recurringInterval", value)}
            value={watch("recurringInterval")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {errors.recurringInterval && (
            <p className="text-sm text-red-500">
              {errors.recurringInterval.message}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" className="w-full" disabled={transactionLoading}>
          {transactionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Creating..."}
            </>
          ) : editMode ? (
            "Update Transaction"
          ) : (
            "Create Transaction"
          )}
        </Button>
      </div>
    </form>
  );
}