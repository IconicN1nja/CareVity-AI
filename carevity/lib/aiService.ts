import axios from 'axios';
import { API_BASE_URL } from './api';
import { fetchAuthSession } from 'aws-amplify/auth';

// IMPORTANT: Once you deploy to Firebase, replace this URL with your actual Cloud Function URL
// e.g., "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/askAI"
// If using Firebase Emulators locally, it looks like: "http://localhost:5001/YOUR-PROJECT-ID/us-central1/askAI"
const CLOUD_FUNCTION_URL = `${API_BASE_URL}/askAI`;

export const generateAIResponse = async (
  userInput: string, 
  userContext: { name: string, bmi: string, bmiLabel: string }
): Promise<{ text: string, pointTrigger?: number }> => {
  
  console.log("Sending AI request to Cloud Functions...");

  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    const response = await axios.post(CLOUD_FUNCTION_URL, {
      data: {
        userInput,
        userContext
      }
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const aiData = response.data.data;
    
    return { 
      text: aiData.text,
      pointTrigger: aiData.pointTrigger
    };

  } catch (error) {
    console.error("Backend Error:", error);
    // Fallback if backend is down or not deployed yet
    return { 
      text: "I am having trouble reaching the CareVity secure cloud right now. Please make sure the backend is running!" 
    };
  }
};
