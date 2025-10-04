interface HealthMetrics {
  date: string;
  hrvScore?: number;
  sleepScore?: number;
  glucoseLevel?: number;
  steps?: number;
  calories?: number;
  restingHeartRate?: number;
}

interface ForecastRequest {
  userId: string;
  metrics: HealthMetrics[];
  cyclePhase?: string;
}

interface ForecastResponse {
  forecast: string;
  recommendations?: string[] | null;
  insights?: any | null;
}

export async function callGenerateForecastEdgeFunction(
  accessToken: string,
  request: ForecastRequest
): Promise<ForecastResponse> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/generate-forecast`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Edge function error: ${errorData.error || response.statusText}`);
  }

  const data = await response.json();
  return data;
}
