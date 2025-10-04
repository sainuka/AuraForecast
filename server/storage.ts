import { 
  type User, 
  type InsertUser,
  type UltrahumanToken,
  type InsertUltrahumanToken,
  type HealthMetric,
  type InsertHealthMetric,
  type WellnessForecast,
  type InsertWellnessForecast,
  type CycleTracking,
  type InsertCycleTracking,
  type HealthGoal,
  type InsertHealthGoal,
} from "@shared/schema";
import { db } from "./db";
import { users, ultrahumanTokens, healthMetrics, wellnessForecasts, cycleTracking, healthGoals } from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Ultrahuman Tokens
  getTokenByUserId(userId: string): Promise<UltrahumanToken | undefined>;
  createToken(token: InsertUltrahumanToken): Promise<UltrahumanToken>;
  updateToken(id: string, token: Partial<InsertUltrahumanToken>): Promise<UltrahumanToken | undefined>;
  
  // Health Metrics
  getMetricsByUserId(userId: string, limit?: number): Promise<HealthMetric[]>;
  getMetricsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<HealthMetric[]>;
  createMetric(metric: InsertHealthMetric): Promise<HealthMetric>;
  upsertMetric(metric: InsertHealthMetric): Promise<HealthMetric>;
  
  // Wellness Forecasts
  getLatestForecast(userId: string): Promise<WellnessForecast | undefined>;
  createForecast(forecast: InsertWellnessForecast): Promise<WellnessForecast>;
  
  // Cycle Tracking
  getCyclesByUserId(userId: string, limit?: number): Promise<CycleTracking[]>;
  getCyclesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<CycleTracking[]>;
  getLatestCycle(userId: string): Promise<CycleTracking | undefined>;
  getCycleById(id: string): Promise<CycleTracking | undefined>;
  createCycle(cycle: InsertCycleTracking): Promise<CycleTracking>;
  updateCycle(id: string, cycle: Partial<InsertCycleTracking>): Promise<CycleTracking | undefined>;
  
  // Health Goals
  getGoalsByUserId(userId: string, status?: string): Promise<HealthGoal[]>;
  getGoalById(id: string): Promise<HealthGoal | undefined>;
  createGoal(goal: InsertHealthGoal): Promise<HealthGoal>;
  updateGoal(id: string, goal: Partial<InsertHealthGoal>): Promise<HealthGoal | undefined>;
  deleteGoal(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // Users
  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Ultrahuman Tokens
  async getTokenByUserId(userId: string): Promise<UltrahumanToken | undefined> {
    const result = await db.select().from(ultrahumanTokens).where(eq(ultrahumanTokens.userId, userId)).limit(1);
    return result[0];
  }

  async createToken(insertToken: InsertUltrahumanToken): Promise<UltrahumanToken> {
    const result = await db.insert(ultrahumanTokens).values(insertToken).returning();
    return result[0];
  }

  async updateToken(id: string, updateData: Partial<InsertUltrahumanToken>): Promise<UltrahumanToken | undefined> {
    const result = await db
      .update(ultrahumanTokens)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(ultrahumanTokens.id, id))
      .returning();
    return result[0];
  }

  // Health Metrics
  async getMetricsByUserId(userId: string, limit: number = 30): Promise<HealthMetric[]> {
    return await db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.date))
      .limit(limit);
  }

  async getMetricsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<HealthMetric[]> {
    return await db
      .select()
      .from(healthMetrics)
      .where(
        and(
          eq(healthMetrics.userId, userId),
          gte(healthMetrics.date, startDate),
          lte(healthMetrics.date, endDate)
        )
      )
      .orderBy(desc(healthMetrics.date));
  }

  async createMetric(insertMetric: InsertHealthMetric): Promise<HealthMetric> {
    const result = await db.insert(healthMetrics).values(insertMetric).returning();
    return result[0];
  }

  async upsertMetric(insertMetric: InsertHealthMetric): Promise<HealthMetric> {
    // Check if a metric exists for this user and date
    const dateStr = new Date(insertMetric.date).toISOString().split('T')[0];
    const existing = await db
      .select()
      .from(healthMetrics)
      .where(
        and(
          eq(healthMetrics.userId, insertMetric.userId),
          sql`DATE(${healthMetrics.date}) = ${dateStr}`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing record - only update fields that have values
      const updateData: any = {};
      if (insertMetric.sleepScore !== undefined && insertMetric.sleepScore !== null) updateData.sleepScore = insertMetric.sleepScore;
      if (insertMetric.sleepDuration !== undefined && insertMetric.sleepDuration !== null) updateData.sleepDuration = insertMetric.sleepDuration;
      if (insertMetric.hrv !== undefined && insertMetric.hrv !== null) updateData.hrv = insertMetric.hrv;
      if (insertMetric.restingHeartRate !== undefined && insertMetric.restingHeartRate !== null) updateData.restingHeartRate = insertMetric.restingHeartRate;
      if (insertMetric.recoveryScore !== undefined && insertMetric.recoveryScore !== null) updateData.recoveryScore = insertMetric.recoveryScore;
      if (insertMetric.steps !== undefined && insertMetric.steps !== null) updateData.steps = insertMetric.steps;
      if (insertMetric.avgGlucose !== undefined && insertMetric.avgGlucose !== null) updateData.avgGlucose = insertMetric.avgGlucose;
      if (insertMetric.glucoseVariability !== undefined && insertMetric.glucoseVariability !== null) updateData.glucoseVariability = insertMetric.glucoseVariability;
      if (insertMetric.temperature !== undefined && insertMetric.temperature !== null) updateData.temperature = insertMetric.temperature;
      if (insertMetric.vo2Max !== undefined && insertMetric.vo2Max !== null) updateData.vo2Max = insertMetric.vo2Max;
      if (insertMetric.rawData !== undefined && insertMetric.rawData !== null) updateData.rawData = insertMetric.rawData;

      const result = await db
        .update(healthMetrics)
        .set(updateData)
        .where(eq(healthMetrics.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      // Insert new record
      const result = await db.insert(healthMetrics).values(insertMetric).returning();
      return result[0];
    }
  }

  // Wellness Forecasts
  async getLatestForecast(userId: string): Promise<WellnessForecast | undefined> {
    const result = await db
      .select()
      .from(wellnessForecasts)
      .where(eq(wellnessForecasts.userId, userId))
      .orderBy(desc(wellnessForecasts.generatedAt))
      .limit(1);
    return result[0];
  }

  async createForecast(insertForecast: InsertWellnessForecast): Promise<WellnessForecast> {
    const result = await db.insert(wellnessForecasts).values(insertForecast).returning();
    return result[0];
  }

  // Cycle Tracking
  async getCyclesByUserId(userId: string, limit: number = 12): Promise<CycleTracking[]> {
    return await db
      .select()
      .from(cycleTracking)
      .where(eq(cycleTracking.userId, userId))
      .orderBy(desc(cycleTracking.periodStartDate))
      .limit(limit);
  }

  async getLatestCycle(userId: string): Promise<CycleTracking | undefined> {
    const result = await db
      .select()
      .from(cycleTracking)
      .where(eq(cycleTracking.userId, userId))
      .orderBy(desc(cycleTracking.periodStartDate))
      .limit(1);
    return result[0];
  }

  async getCycleById(id: string): Promise<CycleTracking | undefined> {
    const result = await db
      .select()
      .from(cycleTracking)
      .where(eq(cycleTracking.id, id))
      .limit(1);
    return result[0];
  }

  async createCycle(insertCycle: InsertCycleTracking): Promise<CycleTracking> {
    const result = await db.insert(cycleTracking).values(insertCycle).returning();
    return result[0];
  }

  async getCyclesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<CycleTracking[]> {
    return await db
      .select()
      .from(cycleTracking)
      .where(
        and(
          eq(cycleTracking.userId, userId),
          gte(cycleTracking.periodStartDate, startDate),
          lte(cycleTracking.periodStartDate, endDate)
        )
      )
      .orderBy(desc(cycleTracking.periodStartDate));
  }

  async updateCycle(id: string, updateData: Partial<InsertCycleTracking>): Promise<CycleTracking | undefined> {
    const result = await db
      .update(cycleTracking)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(cycleTracking.id, id))
      .returning();
    return result[0];
  }

  // Health Goals
  async getGoalsByUserId(userId: string, status?: string): Promise<HealthGoal[]> {
    const conditions = status 
      ? and(eq(healthGoals.userId, userId), eq(healthGoals.status, status))
      : eq(healthGoals.userId, userId);
    
    return await db
      .select()
      .from(healthGoals)
      .where(conditions)
      .orderBy(desc(healthGoals.createdAt));
  }

  async getGoalById(id: string): Promise<HealthGoal | undefined> {
    const result = await db.select().from(healthGoals).where(eq(healthGoals.id, id)).limit(1);
    return result[0];
  }

  async createGoal(insertGoal: InsertHealthGoal): Promise<HealthGoal> {
    const result = await db.insert(healthGoals).values(insertGoal).returning();
    return result[0];
  }

  async updateGoal(id: string, updateData: Partial<InsertHealthGoal>): Promise<HealthGoal | undefined> {
    const result = await db
      .update(healthGoals)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(healthGoals.id, id))
      .returning();
    return result[0];
  }

  async deleteGoal(id: string): Promise<void> {
    await db.delete(healthGoals).where(eq(healthGoals.id, id));
  }
}

export const storage = new DbStorage();
