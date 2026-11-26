import "dotenv/config";
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => /^postgres(?:ql)?:\/\//.test(value),
      "DATABASE_URL must be a PostgreSQL connection URL",
    ),
  API_KEY: z
    .string({ error: "API_KEY is required" })
    .min(32, "API_KEY must be at least 32 characters"),
  JWT_SECRET: z
    .string({ error: "JWT_SECRET is required" })
    .min(32, "JWT_SECRET must be at least 32 characters"),
      CORS_ORIGIN: z
    .string()
    .min(1, "CORS_ORIGIN is required")
    .default("http://localhost:3000"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.5-flash-lite"),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsedEnv.data;
