import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    givenName: {
      required: true,
      mutable: true,
    },
    familyName: {
      required: true,
      mutable: true,
    },
    // Custom attribute for user role
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
  },
  groups: ['ADMIN', 'BUSINESS_OWNER', 'USER'],
  access: (allow) => [
    allow.resource(auth).to(['manageUsers', 'manageGroups']).to('ADMIN'),
  ],
  // Configure password policy
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
  },
  // Configure account recovery
  accountRecovery: 'EMAIL_ONLY',
  // Configure multi-factor authentication (optional but recommended)
  multifactor: {
    mode: 'OPTIONAL',
    sms: true,
    totp: true,
  },
});
