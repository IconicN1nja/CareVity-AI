import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const SYSTEM_PROMPT = `
You are CareVity, an advanced lifestyle and habit coach AI. 
Follow these strict rules:

1. PERSONALIZED ONBOARDING & BMI: 
   If the user's BMI deviates from normal (18.5 - 24.9), explicitly address them by name, call out the metrics, and detail their ideal weight target.

2. NUTRITION & CALORIES: 
   Analyze meals, especially Indian/sub-continental dishes. If they eat deep-fried or unhealthy food (e.g., Samosas), explain the biological impact and instruct the system to deduct points.

3. EXERCISE GUIDANCE: 
   Provide real-time, context-aware functional training (e.g., desk mobility routines if they are sitting too long).

4. TASK BENEFITS: 
   When they complete a task (like drinking water), explain the exact organic biological improvement (e.g., "optimized blood volume").

5. MEDICAL SAFETY BOUNDARY (CRITICAL):
   You are a habit coach, NOT a medical professional. If the user asks about symptoms (e.g., chest heaviness) or pharmaceutical dosages, you MUST DECLINE, issue zero medical recommendations, and order a physician review.
`;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Allow Cross-Origin Requests (CORS)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  try {
    const body = JSON.parse(event.body || '{}');
    const { userInput, userContext } = body.data || body;
    
    if (!userInput) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ data: { error: 'Missing userInput' } }) 
      };
    }

    if (!process.env.SARVAM_API_KEY) {
      // Fallback Mock Logic if Sarvam is not configured yet
      const lowerInput = userInput.toLowerCase();
      let fallbackText = "I am actively listening and processing your habits. Keep pushing towards your daily constants!";
      let pointTrigger = 0;

      if (lowerInput.includes('chest') || lowerInput.includes('pain') || lowerInput.includes('symptom')) {
        fallbackText = `${userContext?.name || 'User'}, I am your lifestyle habit coach, not a medical professional. I cannot evaluate health symptoms or recommend medicine. Please contact a certified physician or emergency services immediately to check on this safely.`;
      } else if (lowerInput.includes('samosa') || lowerInput.includes('eat')) {
        fallbackText = "I see you just had two samosas. That's roughly 500-600 calories of highly refined carbs and deep-fried fats. While delicious, it spikes your blood sugar and increases inflammation. Because this breaks the Clean Fuel challenge, I am deducting 10 points. Let's hydrate and aim for a cleaner dinner!";
        pointTrigger = -10;
      } else if (lowerInput.includes('water') || lowerInput.includes('hydration')) {
        fallbackText = `Phenomenal job hitting your targets today, ${userContext?.name || 'User'}! Drinking your targeted 4 liters of water has optimized your blood volume for maximum oxygen transport. This is steadily reducing your liver strain and driving your monthly digital twin right up to full stability.`;
        pointTrigger = 10;
      } else if (lowerInput.includes('desk') || lowerInput.includes('sluggish')) {
        fallbackText = "Sitting for 4 hours restricts blood flow and drops your metabolic rate. Stand up right now. Do 10 torso twists, reach for the ceiling for 15 seconds, and do 20 air squats. This will immediately push glucose into your muscles and wake up your brain!";
      }

      return { 
        statusCode: 200, 
        headers,
        body: JSON.stringify({ data: { text: fallbackText, pointTrigger } }) 
      };
    }

    // Call Sarvam AI
    const contextString = `User Context: Name: ${userContext?.name || 'Unknown'}, BMI: ${userContext?.bmi || 'Unknown'} (${userContext?.bmiLabel || 'Unknown'})`;

    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.SARVAM_MODEL || 'sarvam-105b',
        temperature: 0.6,
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: contextString },
          { role: 'user', content: userInput }
        ]
      }),
    });
    if (!response.ok) {
      throw new Error(`Sarvam AI returned HTTP ${response.status}`);
    }

    const responseData = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const aiText = responseData.choices?.[0]?.message?.content || '';
    if (!aiText) {
      throw new Error('Sarvam AI returned an empty response');
    }
    
    // Point trigger logic based on AI text
    let pointTrigger = 0;
    if (aiText.toLowerCase().includes('deduct') || aiText.includes('-10')) pointTrigger = -10;
    if (aiText.toLowerCase().includes('phenomenal') || aiText.includes('+10')) pointTrigger = 10;

    return { 
      statusCode: 200, 
      headers,
      body: JSON.stringify({ data: { text: aiText, pointTrigger } }) 
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ data: { error: 'Internal Server Error' } }) 
    };
  }
};
