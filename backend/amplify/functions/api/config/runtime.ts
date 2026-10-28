import { z } from 'zod';

const runtimeSchema = z.object({
  CAREVITY_TABLE_NAME: z.string().min(1),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  SARVAM_API_KEY: z.string().optional(),
  SARVAM_MODEL: z.string().default('sarvam-105b'),
});

export const runtime = runtimeSchema.parse({
  CAREVITY_TABLE_NAME: process.env.CAREVITY_TABLE_NAME,
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
  SARVAM_API_KEY: process.env.SARVAM_API_KEY,
  SARVAM_MODEL: process.env.SARVAM_MODEL,
});
