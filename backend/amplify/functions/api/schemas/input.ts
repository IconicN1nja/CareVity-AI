import { z } from 'zod';

export const onboardingInput = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.coerce.number().int().min(13).max(120),
  heightCm: z.coerce.number().min(100).max(250),
  weightKg: z.coerce.number().min(20).max(300),
  locality: z.string().trim().min(1).max(120),
});
export const stepsInput = z.object({ steps: z.coerce.number().int().min(0).max(200000) });
export const hydrationInput = z.object({ amountMl: z.coerce.number().min(0).max(20000) });
export const sleepInput = z.object({ screenUsedAfterCurfew: z.boolean(), idleUntilMorning: z.boolean() });
export const squadInput = z.object({ squadName: z.string().trim().min(1).max(80).optional(), name: z.string().trim().min(1).max(80).optional() });
export const joinSquadInput = z.object({ roomCode: z.string().trim().length(6).transform((value) => value.toUpperCase()) });
export const coachInput = z.object({
  userMessage: z.string().trim().min(1).max(4000).optional(),
  userInput: z.string().trim().min(1).max(4000).optional(),
}).refine((value) => Boolean(value.userMessage || value.userInput), 'userMessage (or userInput) is required');
