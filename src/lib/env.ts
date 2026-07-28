import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_TIMEZONE: z.string().default("Asia/Kolkata"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().length(3).default("INR"),
});

const serverEnvironmentSchema = publicEnvironmentSchema;

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function readPublicEnvironment(
  source: Record<string, string | undefined> = process.env,
): PublicEnvironment {
  return publicEnvironmentSchema.parse(source);
}

export function readServerEnvironment(
  source: Record<string, string | undefined> = process.env,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(source);
}
