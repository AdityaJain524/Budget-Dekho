import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function listAvailableModels() {
  try {
    // Check if API key exists
    const apiKey = 'AIzaSyC70bAYu-K0v_DPCBI0TXDQUMjLjkjO0TQ'; // Replace with your actual API key';
    console.log('API Key loaded:', !!apiKey);
    console.log('API Key prefix:', apiKey?.substring(0, 10));
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      return;
    }
    
    console.log('Available models:');
    data.models?.forEach(model => {
      console.log(`- ${model.name}`);
    });
    
    return data.models;
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listAvailableModels();