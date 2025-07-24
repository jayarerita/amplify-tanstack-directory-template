import { defineFunction } from '@aws-amplify/backend';

export const wafProtection = defineFunction({
  name: 'waf-protection',
  entry: './handler.ts',
  environment: {
    WAF_REGION: 'us-east-1',
  },
  runtime: 20,
  timeoutSeconds: 60,
});