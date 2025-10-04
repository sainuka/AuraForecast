import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Debug: Log the DATABASE_URL being used (hide password)
const urlMatch = DATABASE_URL.match(/^(postgresql:\/\/[^:]+:[^@]+@)([^\/]+)(\/.*)?$/);
if (urlMatch) {
  console.log(`[DB] Connecting to Supabase host: ${urlMatch[2]}`);
} else {
  console.log(`[DB] DATABASE_URL format: ${DATABASE_URL.substring(0, 50)}...`);
}

// Create Postgres.js client for Supabase
const queryClient = postgres(DATABASE_URL, {
  prepare: false, // Required for Supabase connection pooling
});

export const db = drizzle(queryClient, { schema });
