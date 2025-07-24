import { defineFunction } from '@aws-amplify/backend';

export const adExpiration = defineFunction({
  name: 'ad-expiration',
  entry: './handler.ts',
  schedule: 'rate(1 hour)', // Run every hour to check for expired ads and subscriptions
});