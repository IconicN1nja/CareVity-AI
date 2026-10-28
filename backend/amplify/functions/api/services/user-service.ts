import { onboardingInput } from '../schemas/input';
import { getOrCreateUser, saveUserProfile } from '../repositories/user-repository';
import type { Identity } from '../types/http';

export async function session(identity: Identity) {
  return { authenticated: true, user: await getOrCreateUser(identity) };
}

export async function onboard(identity: Identity, input: Record<string, unknown>) {
  const values = onboardingInput.parse(input);
  const bmi = Number((values.weightKg / Math.pow(values.heightCm / 100, 2)).toFixed(1));
  const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  return { user: await saveUserProfile(identity, { ...values, bmi, bmiLabel, district: `${values.locality} District Network`, onboarded: true }) };
}
