import OpenAI from "openai";

// Using the OpenAI blueprint integration
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not configured");
  }
  
  if (!openaiClient) {
    openaiClient = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }
  
  return openaiClient;
}

export const openai = getOpenAIClient;

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

  const prompt = `You are a women's health AI advisor specializing in biometric analysis and personalized wellness guidance. Based on the following health metrics from the past week, provide a comprehensive wellness forecast with specific, actionable recommendations.

Health Metrics:
${metricsText}

Analysis Guidelines:
1. Identify trends and patterns in sleep quality, recovery, glucose, and activity levels
2. Consider how these metrics interrelate and affect overall wellness
3. Provide specific, measurable recommendations (not generic advice like "sleep more")
4. Include timing suggestions when relevant (e.g., "Go to bed by 10 PM" instead of "improve sleep schedule")

Please provide:
1. A brief forecast about the user's wellness trajectory (2-3 sentences). Be specific about trends you observe.
2. Key insights organized by category:
   - Sleep: Patterns, quality, duration trends
   - Recovery: HRV trends, stress indicators, recovery adequacy
   - Metabolism: Glucose stability, energy patterns, activity correlation
3. 5 actionable recommendations with specific actions the user can take. Each recommendation should:
   - Start with a specific action verb
   - Include measurable targets or timeframes when possible
   - Be personalized to the observed data patterns
   - Examples: "Aim for 7.5 hours of sleep by going to bed before 10:30 PM", "Take a 15-minute walk after lunch to stabilize afternoon glucose", "Schedule recovery days after 3 consecutive high-intensity workouts"

Respond in JSON format with this structure:
{
  "forecast": "string",
  "insights": {
    "sleep": "string",
    "recovery": "string", 
    "metabolism": "string"
  },
  "recommendations": ["string", "string", "string", "string", "string"]
}`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
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
      max_tokens: 1000,
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
