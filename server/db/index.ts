import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Force fresh read of DATABASE_URL every time this module loads
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Debug: Log the DATABASE_URL being used (hide password)
const urlMatch = DATABASE_URL.match(/^(postgresql:\/\/[^:]+:[^@]+@)([^\/]+)(\/.*)?$/);
if (urlMatch) {
  console.log(`[DB] Creating connection to host: ${urlMatch[2]}`);
} else {
  console.log(`[DB] DATABASE_URL format: ${DATABASE_URL.substring(0, 50)}...`);
}

// Create a fresh Neon connection with explicit URL
const sql = neon(DATABASE_URL, {
  fullResults: false,
  fetchOptions: {
    cache: 'no-store',
  },
});

export const db = drizzle(sql, { schema });
