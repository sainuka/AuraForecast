import axios from "axios";

const ULTRAHUMAN_BASE_URL = "https://partner.ultrahuman.com";

function validateUltrahumanCredentials() {
  if (!process.env.ULTRAHUMAN_CLIENT_ID || !process.env.ULTRAHUMAN_CLIENT_SECRET) {
    throw new Error("ULTRAHUMAN_CLIENT_ID and ULTRAHUMAN_CLIENT_SECRET are not configured");
  }
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: number;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  validateUltrahumanCredentials();
  
  try {
    const response = await axios.post(
      `${ULTRAHUMAN_BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ULTRAHUMAN_CLIENT_ID!,
        client_secret: process.env.ULTRAHUMAN_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error exchanging code for tokens:", error.response?.data || error.message);
    throw new Error("Failed to exchange authorization code");
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  validateUltrahumanCredentials();
  
  try {
    const response = await axios.post(
      `${ULTRAHUMAN_BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.ULTRAHUMAN_CLIENT_ID!,
        client_secret: process.env.ULTRAHUMAN_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error refreshing token:", error.response?.data || error.message);
    throw new Error("Failed to refresh access token");
  }
}

export async function fetchHealthMetrics(
  accessToken: string,
  date: string
): Promise<any> {
  try {
    const response = await axios.get(
      `${ULTRAHUMAN_BASE_URL}/api/partners/v1/metrics`,
      {
        params: { date },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("TOKEN_EXPIRED");
    }
    console.error("Error fetching health metrics:", error.response?.data || error.message);
    throw new Error("Failed to fetch health metrics");
  }
}

export async function fetchDailyMetricsWithDirectToken(
  date: string,
  email?: string
): Promise<any> {
  const accessToken = process.env.ULTRAHUMAN_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("ULTRAHUMAN_ACCESS_TOKEN not configured");
  }

  try {
    const params: any = { date };
    if (email) {
      params.email = email;
    }

    const response = await axios.get(
      `${ULTRAHUMAN_BASE_URL}/api/v1/partner/daily_metrics`,
      {
        params,
        headers: {
          Authorization: accessToken,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error fetching daily metrics:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to fetch daily metrics");
  }
}
