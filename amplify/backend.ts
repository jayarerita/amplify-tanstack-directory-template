import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { contentModeration } from './functions/content-moderation/resource';
import { generateUploadUrl } from './functions/generate-upload-url/resource';
import { wafProtection } from './functions/waf-protection/resource';
import { moderationTrigger } from './functions/moderation-trigger/resource';
import { stripePayment } from './functions/stripe-payment/resource';
import { adExpiration } from './functions/ad-expiration/resource';

export const backend = defineBackend({
  auth,
  data,
  storage,
  contentModeration,
  generateUploadUrl,
  wafProtection,
  moderationTrigger,
  stripePayment,
  adExpiration,
});

// Grant the functions access to the data and storage resources
backend.contentModeration.addEnvironment('DATA_ENDPOINT', backend.data.graphqlUrl);
backend.generateUploadUrl.addEnvironment('STORAGE_BUCKET_NAME', backend.storage.resources.bucket.bucketName);
backend.moderationTrigger.addEnvironment('DATA_ENDPOINT', backend.data.graphqlUrl);
backend.moderationTrigger.addEnvironment('CONTENT_MODERATION_FUNCTION_NAME', backend.contentModeration.resources.lambda.functionName);

// Grant content moderation function access to AI services and S3
backend.contentModeration.resources.lambda.addToRolePolicy({
  Effect: 'Allow',
  Action: [
    'rekognition:DetectModerationLabels',
    'comprehend:DetectSentiment',
    'comprehend:DetectPiiEntities',
    's3:GetObject'
  ],
  Resource: [
    '*', // Rekognition and Comprehend don't support resource-level permissions
    backend.storage.resources.bucket.arnForObjects('*')
  ]
});

// Grant WAF protection function access to WAF services
backend.wafProtection.resources.lambda.addToRolePolicy({
  Effect: 'Allow',
  Action: [
    'wafv2:CreateWebACL',
    'wafv2:UpdateWebACL',
    'wafv2:GetWebACL',
    'wafv2:ListWebACLs',
    'wafv2:CreateIPSet',
    'wafv2:UpdateIPSet',
    'wafv2:GetIPSet',
    'wafv2:ListIPSets',
    'wafv2:CreateRuleGroup',
    'wafv2:UpdateRuleGroup',
    'wafv2:GetRuleGroup',
    'wafv2:ListRuleGroups'
  ],
  Resource: '*'
});

// Grant moderation trigger function access to invoke other Lambda functions and DynamoDB
backend.moderationTrigger.resources.lambda.addToRolePolicy({
  Effect: 'Allow',
  Action: [
    'lambda:InvokeFunction',
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:Query',
    'dynamodb:Scan'
  ],
  Resource: [
    backend.contentModeration.resources.lambda.functionArn,
    `${backend.data.resources.tables['Listing'].tableArn}*`,
    `${backend.data.resources.tables['Review'].tableArn}*`,
    `${backend.data.resources.tables['ModerationQueue'].tableArn}*`
  ]
});

// Grant Stripe payment function access to DynamoDB
backend.stripePayment.resources.lambda.addToRolePolicy({
  Effect: 'Allow',
  Action: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:Query',
    'dynamodb:Scan'
  ],
  Resource: [
    `${backend.data.resources.tables['Ad'].tableArn}*`,
    `${backend.data.resources.tables['Subscription'].tableArn}*`,
    `${backend.data.resources.tables['Listing'].tableArn}*`
  ]
});

// Grant ad expiration function access to DynamoDB
backend.adExpiration.resources.lambda.addToRolePolicy({
  Effect: 'Allow',
  Action: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:Query',
    'dynamodb:Scan'
  ],
  Resource: [
    `${backend.data.resources.tables['Ad'].tableArn}*`,
    `${backend.data.resources.tables['Subscription'].tableArn}*`,
    `${backend.data.resources.tables['Listing'].tableArn}*`
  ]
});
