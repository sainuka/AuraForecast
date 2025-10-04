import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ultrahumanTokens = pgTable("ultrahuman_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const healthMetrics = pgTable("health_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  sleepScore: integer("sleep_score"),
  sleepDuration: decimal("sleep_duration", { precision: 5, scale: 2 }),
  hrv: integer("hrv"),
  restingHeartRate: integer("resting_heart_rate"),
  recoveryScore: integer("recovery_score"),
  steps: integer("steps"),
  avgGlucose: decimal("avg_glucose", { precision: 5, scale: 2 }),
  glucoseVariability: decimal("glucose_variability", { precision: 5, scale: 2 }),
  temperature: decimal("temperature", { precision: 4, scale: 2 }),
  vo2Max: decimal("vo2_max", { precision: 5, scale: 2 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wellnessForecasts = pgTable("wellness_forecasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  forecast: text("forecast").notNull(),
  insights: jsonb("insights"),
  recommendations: jsonb("recommendations"),
  metricsAnalyzed: jsonb("metrics_analyzed"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const cycleTracking = pgTable("cycle_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodStartDate: timestamp("period_start_date").notNull(),
  periodEndDate: timestamp("period_end_date"),
  cycleLength: integer("cycle_length"),
  flowIntensity: text("flow_intensity"),
  symptoms: jsonb("symptoms").$type<string[]>().default(sql`'[]'::jsonb`),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const healthGoals = pgTable("health_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalType: text("goal_type").notNull(),
  targetMetric: text("target_metric").notNull(),
  targetValue: decimal("target_value", { precision: 10, scale: 2 }).notNull(),
  baselineValue: decimal("baseline_value", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }),
  deadline: timestamp("deadline"),
  status: text("status").notNull().default("active"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Schema for syncing users from Supabase Auth (includes id)
export const syncUserSchema = createInsertSchema(users).omit({
  createdAt: true,
});

export const insertUltrahumanTokenSchema = createInsertSchema(ultrahumanTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHealthMetricSchema = createInsertSchema(healthMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertWellnessForecastSchema = createInsertSchema(wellnessForecasts).omit({
  id: true,
  generatedAt: true,
});

export const insertCycleTrackingSchema = createInsertSchema(cycleTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHealthGoalSchema = createInsertSchema(healthGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCycleTrackingSchema = createInsertSchema(cycleTracking).partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateHealthGoalSchema = createInsertSchema(healthGoals).partial().omit({
  id: true,
  userId: true,
  baselineValue: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UltrahumanToken = typeof ultrahumanTokens.$inferSelect;
export type InsertUltrahumanToken = z.infer<typeof insertUltrahumanTokenSchema>;
export type HealthMetric = typeof healthMetrics.$inferSelect;
export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;
export type WellnessForecast = typeof wellnessForecasts.$inferSelect;
export type InsertWellnessForecast = z.infer<typeof insertWellnessForecastSchema>;
export type CycleTracking = typeof cycleTracking.$inferSelect;
export type InsertCycleTracking = z.infer<typeof insertCycleTrackingSchema>;
export type HealthGoal = typeof healthGoals.$inferSelect;
export type InsertHealthGoal = z.infer<typeof insertHealthGoalSchema>;
export type UpdateCycleTracking = z.infer<typeof updateCycleTrackingSchema>;
export type UpdateHealthGoal = z.infer<typeof updateHealthGoalSchema>;
