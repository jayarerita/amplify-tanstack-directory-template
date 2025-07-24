import { defineFunction } from '@aws-amplify/backend';

export const generateUploadUrl = defineFunction({
  name: 'generate-upload-url',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 15,
});