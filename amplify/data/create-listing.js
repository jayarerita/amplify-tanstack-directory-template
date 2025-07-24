import { util } from '@aws-appsync/utils';

/**
 * Custom resolver for creating listings with enhanced logic
 * Handles guest submissions, slug generation, composite field creation, and content moderation
 */
export function request(ctx) {
  const { input } = ctx.arguments;
  const { identity, request: req } = ctx;
  
  // Generate slug from name
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  // Create composite fields for efficient querying
  const cityState = `${input.city}, ${input.state}`;
  const categoryStatus = input.categories && input.categories.length > 0 
    ? `${input.categories[0]}#PENDING` 
    : 'UNCATEGORIZED#PENDING';
  
  // Determine ownership and status
  let ownerId = null;
  let status = 'PENDING';
  
  if (identity && identity.sub) {
    // Authenticated user - can be published immediately if they're admin
    ownerId = identity.sub;
    // For now, all submissions go to pending for moderation
    status = 'PENDING';
  }
  
  const now = util.time.nowISO8601();
  const listingId = util.autoId();
  
  // Extract spam detection metadata if present
  const spamDetection = input._spamDetection || {};
  
  const item = {
    ...input,
    id: listingId,
    slug,
    cityState,
    categoryStatus,
    ownerId,
    status,
    isSponsored: false,
    averageRating: 0,
    reviewCount: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  
  // Remove spam detection metadata from the main item
  delete item._spamDetection;
  
  // Store the listing first
  ctx.stash.listingItem = item;
  ctx.stash.spamDetection = spamDetection;
  ctx.stash.submitterInfo = {
    ip: req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown',
    submitterId: ownerId
  };
  
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ id: item.id }),
    attributeValues: util.dynamodb.toMapValues(item),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}