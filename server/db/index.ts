import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Debug: Log the DATABASE_URL being used (hide password)
const dbUrl = process.env.DATABASE_URL;
const urlMatch = dbUrl.match(/^(postgresql:\/\/[^:]+:[^@]+@)([^\/]+)(\/.*)?$/);
if (urlMatch) {
  console.log(`[DB] Connecting to host: ${urlMatch[2]}`);
} else {
  console.log(`[DB] DATABASE_URL format: ${dbUrl.substring(0, 50)}...`);
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
