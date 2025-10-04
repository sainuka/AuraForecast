import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCycleTrackingSchema } from "@shared/schema";
import { exchangeCodeForTokens, refreshAccessToken, fetchHealthMetrics } from "./lib/ultrahuman";
import { generateWellnessForecast } from "./lib/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Config route - MUST be before any middleware that might interfere
  app.get("/api/config/supabase", (_req, res) => {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!url || !anonKey) {
      return res.status(500).json({ 
        error: "Supabase configuration not available. Please configure SUPABASE_URL and SUPABASE_ANON_KEY." 
      });
    }
    
    res.json({ url, anonKey });
  });
  
  // Auth routes
  app.post("/api/users/sync", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      
      const { verifySupabaseToken } = await import('./lib/supabase');
      const authenticatedUser = await verifySupabaseToken(token);

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid user data", 
          details: result.error.issues 
        });
      }

      const { id, email, name } = result.data;
      
      if (id !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: User ID mismatch" });
      }
      
      const existingUser = await storage.getUserById(id);
      if (existingUser) {
        return res.json({ user: existingUser });
      }

      const user = await storage.createUser({
        id,
        email,
        name: name || null,
      });

      res.json({ user });
    } catch (error: any) {
      console.error("User sync error:", error);
      res.status(error.message?.includes('token') ? 401 : 400).json({ 
        error: error.message || "User sync failed" 
      });
    }
  });

  // Ultrahuman OAuth routes
  app.post("/api/ultrahuman/callback", async (req, res) => {
    try {
      const { code, userId } = req.body;
      
      if (!code || !userId) {
        return res.status(400).json({ error: "Missing code or userId" });
      }

      const redirectUri = `${req.protocol}://${req.get("host")}/auth/ultrahuman/callback`;
      const tokens = await exchangeCodeForTokens(code, redirectUri);

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await storage.createToken({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      res.status(400).json({ error: error.message || "OAuth callback failed" });
    }
  });

  app.post("/api/ultrahuman/sync", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      let token = await storage.getTokenByUserId(userId);
      if (!token) {
        return res.status(404).json({ error: "Ultrahuman not connected" });
      }

      // Check if token is expired and refresh if needed
      if (new Date(token.expiresAt) < new Date()) {
        const newTokens = await refreshAccessToken(token.refreshToken);
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
        
        token = await storage.updateToken(token.id, {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newExpiresAt,
        });
        
        if (!token) {
          return res.status(500).json({ error: "Failed to update token" });
        }
      }

      // Fetch health metrics for the last 7 days
      const promises = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        promises.push(
          fetchHealthMetrics(token.accessToken, dateStr).catch((err) => {
            console.error(`Failed to fetch metrics for ${dateStr}:`, err);
            return null;
          })
        );
      }

      const metricsResults = await Promise.all(promises);
      const validMetrics = metricsResults.filter((m) => m !== null);

      // Store metrics in database
      for (const metricData of validMetrics) {
        if (metricData && metricData.date) {
          await storage.createMetric({
            userId,
            date: new Date(metricData.date),
            sleepScore: metricData.sleep_score,
            sleepDuration: metricData.sleep_duration,
            hrv: metricData.hrv,
            restingHeartRate: metricData.resting_heart_rate,
            recoveryScore: metricData.recovery_score,
            steps: metricData.steps,
            avgGlucose: metricData.avg_glucose,
            glucoseVariability: metricData.glucose_variability,
            temperature: metricData.temperature,
            vo2Max: metricData.vo2_max,
            rawData: metricData,
          });
        }
      }

      res.json({ success: true, metricsCount: validMetrics.length });
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(400).json({ error: error.message || "Sync failed" });
    }
  });

  // Health metrics routes
  app.get("/api/metrics/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const metrics = await storage.getMetricsByUserId(userId, 30);
      res.json(metrics);
    } catch (error: any) {
      console.error("Get metrics error:", error);
      res.status(400).json({ error: error.message || "Failed to get metrics" });
    }
  });

  // Wellness forecast routes
  app.get("/api/forecast/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const forecast = await storage.getLatestForecast(userId);
      res.json(forecast || null);
    } catch (error: any) {
      console.error("Get forecast error:", error);
      res.status(400).json({ error: error.message || "Failed to get forecast" });
    }
  });

  app.post("/api/forecast/generate", async (req, res) => {
    try {
      const { userId, accessToken, cyclePhase } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const metrics = await storage.getMetricsByUserId(userId, 7);
      
      if (metrics.length === 0) {
        return res.status(400).json({ error: "No health metrics available" });
      }

      let forecastText: string;
      let recommendations: string[] | null = null;
      let insights: any = null;

      // If Supabase Edge Functions are deployed and accessToken is provided, use edge function
      if (accessToken && process.env.SUPABASE_URL && process.env.USE_EDGE_FUNCTIONS === 'true') {
        const { callGenerateForecastEdgeFunction } = await import('./lib/supabase-edge');
        
        const edgeRequest = {
          userId,
          metrics: metrics.map((m) => ({
            date: m.date.toISOString().split('T')[0],
            hrvScore: m.hrv || undefined,
            sleepScore: m.sleepScore || undefined,
            glucoseLevel: m.avgGlucose ? Number(m.avgGlucose) : undefined,
            steps: m.steps || undefined,
            restingHeartRate: m.restingHeartRate || undefined,
          })),
          cyclePhase,
        };

        const edgeResponse = await callGenerateForecastEdgeFunction(accessToken, edgeRequest);
        forecastText = edgeResponse.forecast;
        recommendations = edgeResponse.recommendations || null;
        insights = edgeResponse.insights || null;
      } else {
        // Fallback to direct OpenAI call (for development or if edge functions not deployed)
        const forecastData = await generateWellnessForecast(
          metrics.map((m) => ({
            sleepScore: m.sleepScore || undefined,
            sleepDuration: m.sleepDuration ? Number(m.sleepDuration) : undefined,
            hrv: m.hrv || undefined,
            restingHeartRate: m.restingHeartRate || undefined,
            recoveryScore: m.recoveryScore || undefined,
            steps: m.steps || undefined,
            avgGlucose: m.avgGlucose ? Number(m.avgGlucose) : undefined,
            glucoseVariability: m.glucoseVariability ? Number(m.glucoseVariability) : undefined,
            temperature: m.temperature ? Number(m.temperature) : undefined,
            vo2Max: m.vo2Max ? Number(m.vo2Max) : undefined,
          }))
        );
        forecastText = forecastData.forecast;
        recommendations = forecastData.recommendations;
        insights = forecastData.insights;
      }

      const forecast = await storage.createForecast({
        userId,
        forecast: forecastText,
        insights: insights,
        recommendations: recommendations,
        metricsAnalyzed: { count: metrics.length },
      });

      res.json(forecast);
    } catch (error: any) {
      console.error("Generate forecast error:", error);
      res.status(400).json({ error: error.message || "Failed to generate forecast" });
    }
  });

  // Cycle tracking routes
  app.get("/api/cycles/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const cycles = await storage.getCyclesByUserId(userId);
      res.json(cycles);
    } catch (error: any) {
      console.error("Get cycles error:", error);
      res.status(400).json({ error: error.message || "Failed to get cycles" });
    }
  });

  app.get("/api/cycles/:userId/latest", async (req, res) => {
    try {
      const { userId } = req.params;
      const cycle = await storage.getLatestCycle(userId);
      res.json(cycle || null);
    } catch (error: any) {
      console.error("Get latest cycle error:", error);
      res.status(400).json({ error: error.message || "Failed to get latest cycle" });
    }
  });

  app.post("/api/cycles", async (req, res) => {
    try {
      const result = insertCycleTrackingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid cycle data", 
          details: result.error.issues 
        });
      }

      const cycle = await storage.createCycle(result.data);
      res.json(cycle);
    } catch (error: any) {
      console.error("Create cycle error:", error);
      res.status(400).json({ error: error.message || "Failed to create cycle" });
    }
  });

  app.patch("/api/cycles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const cycle = await storage.updateCycle(id, req.body);
      if (!cycle) {
        return res.status(404).json({ error: "Cycle not found" });
      }

      res.json(cycle);
    } catch (error: any) {
      console.error("Update cycle error:", error);
      res.status(400).json({ error: error.message || "Failed to update cycle" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
