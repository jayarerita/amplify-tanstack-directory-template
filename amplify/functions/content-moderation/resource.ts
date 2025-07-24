import { defineFunction } from '@aws-amplify/backend';

export const contentModeration = defineFunction({
  name: 'content-moderation',
  entry: './handler.ts',
  environment: {
    // Environment variables for AI services
    REKOGNITION_REGION: 'us-east-1',
    COMPREHEND_REGION: 'us-east-1',
  },
  runtime: 20,
  timeoutSeconds: 60, // Increased timeout for AI service calls
});