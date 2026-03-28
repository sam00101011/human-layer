import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5433/human_layer"),
  SESSION_SECRET: z.string().default("dev-session-secret-change-me"),
  EXTENSION_TOKEN_SECRET: z.string().default("dev-extension-token-secret-change-me")
});

export const env = envSchema.parse(process.env);
