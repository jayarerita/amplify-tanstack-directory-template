import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'directoryStorage',
  access: (allow) => ({
    'listings/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write']),
    ],
    'avatars/*': [
      allow.authenticated.to(['read', 'write']),
    ],
    'ads/*': [
      allow.guest.to(['read']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
  }),
});