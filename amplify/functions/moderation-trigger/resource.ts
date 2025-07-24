import { defineFunction } from '@aws-amplify/backend';

export const moderationTrigger = defineFunction({
  name: 'moderation-trigger',
  entry: './handler.ts',
  environment: {
    CONTENT_MODERATION_FUNCTION_NAME: 'content-moderation',
  },
  runtime: 20,
  timeoutSeconds: 60,
});