import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, syncUserSchema, insertCycleTrackingSchema, insertHealthGoalSchema, updateCycleTrackingSchema, updateHealthGoalSchema } from "@shared/schema";
import { exchangeCodeForTokens, refreshAccessToken, fetchHealthMetrics, fetchDailyMetricsWithDirectToken } from "./lib/ultrahuman";
import { generateWellnessForecast } from "./lib/openai";
import type { User } from "@supabase/supabase-js";

async function authenticateUser(req: Request, res: Response): Promise<User | null> {
  return {
    id: "4d36312c-54ad-47da-a514-6535093b4280",
    email: "demo@wellness-tracker.com",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: { name: "Demo User" },
    created_at: new Date().toISOString(),
  } as User;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Config routes - MUST be before any middleware that might interfere
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

  app.get("/api/config/ultrahuman", (_req, res) => {
    const clientId = process.env.ULTRAHUMAN_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({ 
        error: "Ultrahuman configuration not available. Please configure ULTRAHUMAN_CLIENT_ID." 
      });
    }
    
    res.json({ clientId });
  });
  
  // Auth routes
  app.post("/api/users/sync", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const result = syncUserSchema.safeParse(req.body);
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
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { code, userId } = req.body;
      
      if (!code || !userId) {
        return res.status(400).json({ error: "Missing code or userId" });
      }

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot create token for other users" });
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
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot sync data for other users" });
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

  // Direct token sync - uses ULTRAHUMAN_ACCESS_TOKEN env var
  app.post("/api/ultrahuman/sync-direct", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId, email } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot sync data for other users" });
      }

      // Fetch health metrics for the last 7 days using direct token
      const promises = [];
      const dateStrs: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateStrs.push(dateStr);
        promises.push(
          fetchDailyMetricsWithDirectToken(dateStr, email).catch((err) => {
            console.error(`Failed to fetch metrics for ${dateStr}:`, err);
            return null;
          })
        );
      }

      const metricsResults = await Promise.all(promises);

      let insertedCount = 0;

      // Process each day's metrics
      for (let i = 0; i < metricsResults.length; i++) {
        const response = metricsResults[i];
        const dateStr = dateStrs[i];
        
        if (!response || !response.data || !response.data.metrics) continue;
        
        // Extract metrics for this specific date
        const dateMetrics = response.data.metrics[dateStr];
        if (!dateMetrics || !Array.isArray(dateMetrics)) continue;
        
        console.log(`[Sync] Processing ${dateMetrics.length} metric types for ${dateStr}`);
        
        // Log all metric types to understand data structure
        const metricTypes = dateMetrics.map(m => m.type).filter(Boolean);
        console.log(`[Sync] Available metric types for ${dateStr}:`, metricTypes);
        
        // Aggregate all metrics for this date
        const aggregated: any = {};
        
        for (const metric of dateMetrics) {
          if (!metric || !metric.type || !metric.object) continue;
          
          const { type, object: metricObj } = metric;
          
          // Helper to extract value from object (handles both direct value and values array)
          const extractValue = (obj: any, useAverage = false): number | null => {
            if (obj.value !== undefined && obj.value !== null) {
              return obj.value;
            }
            if (obj.values && Array.isArray(obj.values) && obj.values.length > 0) {
              const values = obj.values.map((v: any) => v.value).filter((v: number) => v !== null && v !== undefined && !isNaN(v));
              if (values.length === 0) return null;
              if (useAverage) {
                return Math.round(values.reduce((a: number, b: number) => a + b) / values.length);
              }
              return values[values.length - 1]; // Most recent value
            }
            return null;
          };
          
          // Extract values based on metric type
          switch (type) {
            case 'sleep':
              // Sleep is a complex nested object
              console.log('Processing sleep metric:', JSON.stringify(metricObj, null, 2));
              if (metricObj.sleep_score?.score !== undefined) {
                aggregated.sleepScore = metricObj.sleep_score.score;
                console.log('Extracted sleep score:', aggregated.sleepScore);
              }
              if (metricObj.total_sleep?.minutes !== undefined) {
                aggregated.sleepDuration = metricObj.total_sleep.minutes;
                console.log('Extracted sleep duration:', aggregated.sleepDuration);
              }
              if (metricObj.average_body_temperature?.celsius !== undefined) {
                aggregated.temperature = metricObj.average_body_temperature.celsius;
                console.log('Extracted temperature:', aggregated.temperature);
              }
              break;
            
            case 'night_rhr':
            case 'sleep_rhr':
            case 'resting_hr':
              aggregated.restingHeartRate = extractValue(metricObj);
              break;
            
            case 'hrv':
            case 'avg_sleep_hrv':
              aggregated.hrv = extractValue(metricObj, true); // Use average
              break;
            
            case 'steps':
              aggregated.steps = extractValue(metricObj);
              break;
            
            case 'recovery':
            case 'recovery_index':
            case 'recovery_score':
              aggregated.recoveryScore = extractValue(metricObj);
              break;
            
            case 'glucose':
            case 'average_glucose':
            case 'avg_glucose':
              aggregated.avgGlucose = extractValue(metricObj);
              break;
            
            case 'glucose_variability':
              aggregated.glucoseVariability = extractValue(metricObj);
              break;
            
            case 'vo2_max':
              aggregated.vo2Max = extractValue(metricObj);
              break;
          }
        }
        
        // Upsert metrics (insert new or update existing)
        if (Object.keys(aggregated).length > 0) {
          await storage.upsertMetric({
            userId,
            date: new Date(dateStr),
            sleepScore: aggregated.sleepScore || null,
            sleepDuration: aggregated.sleepDuration || null,
            hrv: aggregated.hrv || null,
            restingHeartRate: aggregated.restingHeartRate || null,
            recoveryScore: aggregated.recoveryScore || null,
            steps: aggregated.steps || null,
            avgGlucose: aggregated.avgGlucose || null,
            glucoseVariability: aggregated.glucoseVariability || null,
            temperature: aggregated.temperature || null,
            vo2Max: aggregated.vo2Max || null,
            rawData: dateMetrics,
          });
          
          insertedCount++;
          console.log(`[Sync] Upserted metrics for ${dateStr}:`, aggregated);
        }
      }

      res.json({ success: true, metricsCount: insertedCount });
    } catch (error: any) {
      console.error("Direct sync error:", error);
      res.status(400).json({ error: error.message || "Direct sync failed" });
    }
  });

  // Health metrics routes
  app.get("/api/metrics/:userId", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.params;

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot access metrics for other users" });
      }

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
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.params;

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot access forecast for other users" });
      }

      const forecast = await storage.getLatestForecast(userId);
      res.json(forecast || null);
    } catch (error: any) {
      console.error("Get forecast error:", error);
      res.status(400).json({ error: error.message || "Failed to get forecast" });
    }
  });

  app.post("/api/forecast/generate", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId, accessToken, cyclePhase } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot generate forecast for other users" });
      }

      const metrics = await storage.getMetricsByUserId(userId, 7);
      
      if (metrics.length === 0) {
        return res.status(400).json({ error: "No health metrics available" });
      }

      let forecastText: string;
      let recommendations: string[] | null = null;
      let insights: any = null;

      // If Supabase Edge Functions are deployed and accessToken is provided, use edge function
      // The accessToken should be the same as the Bearer token used for authentication
      if (accessToken && process.env.SUPABASE_URL && process.env.USE_EDGE_FUNCTIONS === 'true') {
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader?.replace('Bearer ', '');
        
        if (accessToken !== bearerToken) {
          return res.status(403).json({ error: "Forbidden: Access token mismatch" });
        }
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
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.params;

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot access cycles for other users" });
      }

      const cycles = await storage.getCyclesByUserId(userId);
      res.json(cycles);
    } catch (error: any) {
      console.error("Get cycles error:", error);
      res.status(400).json({ error: error.message || "Failed to get cycles" });
    }
  });

  app.get("/api/cycles/:userId/latest", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.params;

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot access cycles for other users" });
      }

      const cycle = await storage.getLatestCycle(userId);
      res.json(cycle || null);
    } catch (error: any) {
      console.error("Get latest cycle error:", error);
      res.status(400).json({ error: error.message || "Failed to get latest cycle" });
    }
  });

  app.post("/api/cycles", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const result = insertCycleTrackingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid cycle data", 
          details: result.error.issues 
        });
      }

      if (result.data.userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot create cycles for other users" });
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
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { id } = req.params;
      
      const existingCycle = await storage.getCycleById(id);
      if (!existingCycle) {
        return res.status(404).json({ error: "Cycle not found" });
      }

      if (existingCycle.userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot update cycles for other users" });
      }

      const result = updateCycleTrackingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid cycle update data", 
          details: result.error.issues 
        });
      }

      const cycle = await storage.updateCycle(id, result.data);
      res.json(cycle);
    } catch (error: any) {
      console.error("Update cycle error:", error);
      res.status(400).json({ error: error.message || "Failed to update cycle" });
    }
  });

  // Health Goals routes
  app.get("/api/goals/:userId", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.params;

      if (userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot access goals for other users" });
      }

      const { status } = req.query;
      const goals = await storage.getGoalsByUserId(userId, status as string);
      res.json(goals);
    } catch (error: any) {
      console.error("Get goals error:", error);
      res.status(400).json({ error: error.message || "Failed to get goals" });
    }
  });

  app.get("/api/goals/detail/:id", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { id } = req.params;
      const goal = await storage.getGoalById(id);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      if (goal.userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot access goals for other users" });
      }

      res.json(goal);
    } catch (error: any) {
      console.error("Get goal error:", error);
      res.status(400).json({ error: error.message || "Failed to get goal" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const result = insertHealthGoalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid goal data", 
          details: result.error.issues 
        });
      }

      if (result.data.userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot create goals for other users" });
      }

      const goal = await storage.createGoal(result.data);
      res.json(goal);
    } catch (error: any) {
      console.error("Create goal error:", error);
      res.status(400).json({ error: error.message || "Failed to create goal" });
    }
  });

  app.patch("/api/goals/:id", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { id } = req.params;
      
      const existingGoal = await storage.getGoalById(id);
      if (!existingGoal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      if (existingGoal.userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot update goals for other users" });
      }

      const result = updateHealthGoalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid goal update data", 
          details: result.error.issues 
        });
      }

      const goal = await storage.updateGoal(id, result.data);
      res.json(goal);
    } catch (error: any) {
      console.error("Update goal error:", error);
      res.status(400).json({ error: error.message || "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { id } = req.params;
      
      const existingGoal = await storage.getGoalById(id);
      if (!existingGoal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      if (existingGoal.userId !== authenticatedUser.id) {
        return res.status(403).json({ error: "Forbidden: Cannot delete goals for other users" });
      }

      await storage.deleteGoal(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete goal error:", error);
      res.status(400).json({ error: error.message || "Failed to delete goal" });
    }
  });

  // Data Export routes
  app.get("/api/export/metrics/:userId", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (authenticatedUser.id !== userId) {
        return res.status(403).json({ error: "Forbidden: Cannot export data for other users" });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start and end dates are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const metrics = await storage.getMetricsByDateRange(userId, start, end);

      const csvHeaders = [
        "Date",
        "Sleep Score",
        "Sleep Duration (hrs)",
        "HRV",
        "Resting Heart Rate",
        "Recovery Score",
        "Steps",
        "Avg Glucose (mg/dL)",
        "Glucose Variability",
        "Temperature (°C)",
        "VO2 Max"
      ].join(",");

      const csvRows = metrics.map(m => [
        new Date(m.date).toISOString().split('T')[0],
        m.sleepScore || "",
        m.sleepDuration || "",
        m.hrv || "",
        m.restingHeartRate || "",
        m.recoveryScore || "",
        m.steps || "",
        m.avgGlucose || "",
        m.glucoseVariability || "",
        m.temperature || "",
        m.vo2Max || ""
      ].join(","));

      const csv = [csvHeaders, ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="health-metrics-${startDate}-to-${endDate}.csv"`);
      res.send(csv);
    } catch (error: any) {
      console.error("Export metrics error:", error);
      res.status(400).json({ error: error.message || "Failed to export metrics" });
    }
  });

  app.get("/api/export/goals/:userId", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.params;

      if (authenticatedUser.id !== userId) {
        return res.status(403).json({ error: "Forbidden: Cannot export data for other users" });
      }

      const goals = await storage.getGoalsByUserId(userId);

      const csvHeaders = [
        "Goal Type",
        "Target Metric",
        "Target Value",
        "Baseline Value",
        "Current Value",
        "Status",
        "Deadline",
        "Description",
        "Created At"
      ].join(",");

      const csvRows = goals.map(g => [
        g.goalType,
        g.targetMetric,
        g.targetValue,
        g.baselineValue || "",
        g.currentValue || "",
        g.status,
        g.deadline ? new Date(g.deadline).toISOString().split('T')[0] : "",
        `"${(g.description || "").replace(/"/g, '""')}"`,
        new Date(g.createdAt).toISOString().split('T')[0]
      ].join(","));

      const csv = [csvHeaders, ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="health-goals-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error: any) {
      console.error("Export goals error:", error);
      res.status(400).json({ error: error.message || "Failed to export goals" });
    }
  });

  app.get("/api/export/cycles/:userId", async (req, res) => {
    try {
      const authenticatedUser = await authenticateUser(req, res);
      if (!authenticatedUser) return;

      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (authenticatedUser.id !== userId) {
        return res.status(403).json({ error: "Forbidden: Cannot export data for other users" });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start and end dates are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const cycles = await storage.getCyclesByDateRange(userId, start, end);

      const csvHeaders = [
        "Period Start Date",
        "Period End Date",
        "Cycle Length (days)",
        "Flow Intensity",
        "Symptoms",
        "Notes"
      ].join(",");

      const csvRows = cycles.map(c => [
        new Date(c.periodStartDate).toISOString().split('T')[0],
        c.periodEndDate ? new Date(c.periodEndDate).toISOString().split('T')[0] : "",
        c.cycleLength || "",
        c.flowIntensity || "",
        c.symptoms ? `"${c.symptoms.join(", ")}"` : "",
        `"${(c.notes || "").replace(/"/g, '""')}"`
      ].join(","));

      const csv = [csvHeaders, ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="cycle-tracking-${startDate}-to-${endDate}.csv"`);
      res.send(csv);
    } catch (error: any) {
      console.error("Export cycles error:", error);
      res.status(400).json({ error: error.message || "Failed to export cycles" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
