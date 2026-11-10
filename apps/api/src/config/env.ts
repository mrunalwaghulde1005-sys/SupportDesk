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
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsedEnv.data;
