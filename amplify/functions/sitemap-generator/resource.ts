import { defineFunction } from '@aws-amplify/backend';

export const sitemapGenerator = defineFunction({
  name: 'sitemap-generator',
  entry: './handler.ts',
  environment: {
    AMPLIFY_DATA_GRAPHQL_ENDPOINT: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '',
  },
  timeoutSeconds: 30,
});