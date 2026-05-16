import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().transform(Number).default("3001"),
  CORS_ORIGINS: z.string().optional(),
  DATA_SYNC_ENABLED: z.string().optional().transform((value) => String(value || "true").toLowerCase() !== "false"),
  DATA_SYNC_INTERVAL_MINUTES: z.string().optional().transform((value) => {
    const minutes = Number(value || 5);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
  }),
  
  // Database
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.string().transform(Number).default("3306"),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("agoda_clone"),
  
  // Auth
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  
  // Admin Bootstrap
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().default("Administrator"),
  
  // External APIs
  PLACES_USER_AGENT: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const config = _env.data;
export default config;
