import { defineFunction } from '@aws-amplify/backend';

export const api = defineFunction({
  name: 'carevityApi',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  resourceGroupName: 'api',
});
