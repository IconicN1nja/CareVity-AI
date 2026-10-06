import { defineFunction, secret } from '@aws-amplify/backend';

export const askAI = defineFunction({
  name: 'askAI',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    SARVAM_API_KEY: secret('SARVAM_API_KEY'),
    SARVAM_MODEL: 'sarvam-105b',
  },
});