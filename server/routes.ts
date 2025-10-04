import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { exchangeCodeForTokens, refreshAccessToken, fetchHealthMetrics } from "./lib/ultrahuman";
import { generateWellnessForecast } from "./lib/openai";
import bcrypt from "bcryptjs";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message || "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
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
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const metrics = await storage.getMetricsByUserId(userId, 7);
      
      if (metrics.length === 0) {
        return res.status(400).json({ error: "No health metrics available" });
      }

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

      const forecast = await storage.createForecast({
        userId,
        forecast: forecastData.forecast,
        insights: forecastData.insights,
        recommendations: forecastData.recommendations,
        metricsAnalyzed: { count: metrics.length },
      });

      res.json(forecast);
    } catch (error: any) {
      console.error("Generate forecast error:", error);
      res.status(400).json({ error: error.message || "Failed to generate forecast" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
