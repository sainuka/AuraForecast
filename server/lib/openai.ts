import OpenAI from "openai";

// Using the OpenAI blueprint integration
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface HealthData {
  sleepScore?: number;
  sleepDuration?: number;
  hrv?: number;
  restingHeartRate?: number;
  recoveryScore?: number;
  steps?: number;
  avgGlucose?: number;
  glucoseVariability?: number;
  temperature?: number;
  vo2Max?: number;
}

export async function generateWellnessForecast(
  recentMetrics: HealthData[]
): Promise<{
  forecast: string;
  insights: any;
  recommendations: string[];
}> {
  const metricsText = recentMetrics
    .map((m, idx) => {
      return `Day ${idx + 1}: Sleep ${m.sleepScore || 'N/A'}, HRV ${m.hrv || 'N/A'}ms, Recovery ${m.recoveryScore || 'N/A'}, Glucose ${m.avgGlucose || 'N/A'}mg/dL, Steps ${m.steps || 'N/A'}`;
    })
    .join('\n');

  const prompt = `You are a women's health AI advisor. Based on the following health metrics from the past week, provide a personalized wellness forecast and recommendations.

Health Metrics:
${metricsText}

Please provide:
1. A brief forecast about the user's wellness trajectory (2-3 sentences)
2. Key insights about patterns in the data
3. 3-5 actionable recommendations for improving health

Respond in JSON format with this structure:
{
  "forecast": "string",
  "insights": {
    "sleep": "string",
    "recovery": "string", 
    "metabolism": "string"
  },
  "recommendations": ["string", "string", "string"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a compassionate women's health AI advisor specializing in interpreting biometric data and providing actionable wellness guidance.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      forecast: result.forecast || "Unable to generate forecast at this time.",
      insights: result.insights || {},
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("Error generating wellness forecast:", error);
    throw new Error("Failed to generate wellness forecast");
  }
}
