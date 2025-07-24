import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // User Profile model
  UserProfile: a
    .model({
      email: a.string().required(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      avatar: a.string(),
      role: a.enum(['USER', 'BUSINESS_OWNER', 'ADMIN']),
      bio: a.string(),
      location: a.string(),
      emailNotifications: a.boolean().default(true),
      marketingEmails: a.boolean().default(false),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['admin']).to(['read', 'update', 'delete']),
      allow.authenticated().to(['read']),
    ]),

  // Category model
  Category: a
    .model({
      name: a.string().required(),
      slug: a.string().required(),
      description: a.string(),
      parentId: a.id(),
      imageUrl: a.string(),
      isActive: a.boolean().default(true),
      sortOrder: a.integer().default(0),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.groups(['admin']).to(['create', 'update', 'delete']),
    ]),

  // Tag model
  Tag: a
    .model({
      name: a.string().required(),
      slug: a.string().required(),
      description: a.string(),
      color: a.string(),
      isActive: a.boolean().default(true),
      usageCount: a.integer().default(0),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.groups(['admin']).to(['create', 'update', 'delete']),
      allow.authenticated().to(['read']),
    ]),

  // Listing model - core entity
  Listing: a
    .model({
      name: a.string().required(),
      description: a.string().required(),
      slug: a.string().required(),
      
      // Address fields
      street: a.string().required(),
      city: a.string().required(),
      state: a.string().required(),
      zipCode: a.string().required(),
      country: a.string().required(),
      latitude: a.float().required(),
      longitude: a.float().required(),
      
      // Contact information
      phone: a.string(),
      email: a.string(),
      website: a.string(),
      
      // Social media
      facebook: a.string(),
      twitter: a.string(),
      instagram: a.string(),
      linkedin: a.string(),
      
      // Business details
      images: a.string().array(), // S3 URLs
      hoursOfOperation: a.json(), // JSON object for hours
      pricingRange: a.enum(['BUDGET', 'MODERATE', 'EXPENSIVE', 'LUXURY']),
      categories: a.string().array(),
      tags: a.string().array(),
      features: a.string().array(),
      amenities: a.string().array(),
      
      // Status and ownership
      status: a.enum(['PENDING', 'PUBLISHED', 'DRAFT', 'ARCHIVED']).default('PENDING'),
      ownerId: a.id(),
      
      // Sponsorship
      isSponsored: a.boolean().default(false),
      sponsoredRank: a.integer(),
      sponsoredTier: a.enum(['BRONZE', 'SILVER', 'GOLD']),
      
      // Aggregated data
      averageRating: a.float(),
      reviewCount: a.integer().default(0),
      version: a.integer().default(1),
      
      // Fields for efficient querying
      cityState: a.string(), // Composite field for location queries
      categoryStatus: a.string(), // Composite field for category + status queries
    })
    .secondaryIndexes((index) => [
      // GSI for status-based queries (admin moderation queue)
      index('status')
        .sortKeys(['createdAt'])
        .queryField('listingsByStatus'),
      
      // GSI for location-based queries
      index('cityState')
        .sortKeys(['createdAt'])
        .queryField('listingsByLocation'),
      
      // GSI for category-based queries with status filtering
      index('categoryStatus')
        .sortKeys(['sponsoredRank', 'createdAt'])
        .queryField('listingsByCategory'),
      
      // GSI for owner-based queries
      index('ownerId')
        .sortKeys(['status', 'createdAt'])
        .queryField('listingsByOwner'),
      
      // GSI for sponsored listings
      index('isSponsored')
        .sortKeys(['sponsoredRank'])
        .queryField('sponsoredListings'),
    ])
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['create']), // Allow unauthenticated submissions
      allow.owner('ownerId').to(['read', 'update']),
      allow.groups(['admin']).to(['create', 'read', 'update', 'delete']),
    ]),

  // Review model
  Review: a
    .model({
      listingId: a.id().required(),
      userId: a.id().required(),
      rating: a.integer().required(), // 1-5
      comment: a.string(),
      status: a.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
      
      // Business owner response
      responseText: a.string(),
      responseDate: a.datetime(),
      respondedBy: a.id(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']).where('status').eq('APPROVED'),
      allow.authenticated().to(['create']),
      allow.owner('userId').to(['read', 'update']),
      allow.groups(['admin']).to(['create', 'read', 'update', 'delete']),
    ]),

  // Ad model for banner advertisements
  Ad: a
    .model({
      imageUrl: a.string().required(),
      targetUrl: a.string().required(),
      dimensions: a.string().required(), // e.g., "728x90"
      placement: a.string().required(), // e.g., "homepage-top"
      startDate: a.datetime().required(),
      endDate: a.datetime().required(),
      isActive: a.boolean().default(true),
      impressions: a.integer().default(0),
      clicks: a.integer().default(0),
      ownerId: a.id().required(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']).where('isActive').eq(true),
      allow.owner('ownerId').to(['read', 'update']),
      allow.groups(['admin']).to(['create', 'read', 'update', 'delete']),
    ]),

  // Subscription model for premium features
  Subscription: a
    .model({
      userId: a.id().required(),
      tier: a.enum(['BRONZE', 'SILVER', 'GOLD']).required(),
      stripeSubscriptionId: a.string().required(),
      status: a.enum(['ACTIVE', 'CANCELED', 'PAST_DUE']).default('ACTIVE'),
      currentPeriodStart: a.datetime().required(),
      currentPeriodEnd: a.datetime().required(),
      features: a.string().array(),
    })
    .authorization((allow) => [
      allow.owner('userId').to(['read']),
      allow.groups(['admin']).to(['create', 'read', 'update', 'delete']),
    ]),

  // Favorite listings for users
  Favorite: a
    .model({
      userId: a.id().required(),
      listingId: a.id().required(),
    })
    .authorization((allow) => [
      allow.owner('userId').to(['create', 'read', 'delete']),
    ]),

  // Contact form submissions
  ContactSubmission: a
    .model({
      listingId: a.id().required(),
      senderName: a.string().required(),
      senderEmail: a.string().required(),
      senderPhone: a.string(),
      message: a.string().required(),
      isRead: a.boolean().default(false),
      listingOwnerId: a.id().required(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['create']),
      allow.owner('listingOwnerId').to(['read', 'update']),
      allow.groups(['admin']).to(['read', 'update', 'delete']),
    ]),

  // Version history for listings
  ListingVersion: a
    .model({
      listingId: a.id().required(),
      version: a.integer().required(),
      changes: a.json().required(), // JSON object containing the changes made
      changedBy: a.id().required(),
      changeType: a.enum(['CREATE', 'UPDATE', 'CLAIM', 'STATUS_CHANGE']).required(),
      previousData: a.json(), // Previous state for rollback capability
      changeDescription: a.string(),
    })
    .secondaryIndexes((index) => [
      index('listingId')
        .sortKeys(['version'])
        .queryField('versionsByListing'),
    ])
    .authorization((allow) => [
      allow.owner('changedBy').to(['read']),
      allow.groups(['admin']).to(['create', 'read', 'update', 'delete']),
    ]),

  // Moderation queue for content requiring human review
  ModerationQueue: a
    .model({
      contentType: a.enum(['LISTING', 'REVIEW']).required(),
      contentId: a.id().required(),
      status: a.enum(['PENDING', 'APPROVED', 'REJECTED', 'ESCALATED']).default('PENDING'),
      priority: a.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      
      // AI analysis results
      aiFlags: a.string().array(),
      aiConfidence: a.float(),
      aiDetails: a.json(),
      
      // Content snapshot for review
      contentSnapshot: a.json().required(),
      
      // Moderation decision
      moderatorId: a.id(),
      moderationDecision: a.enum(['APPROVE', 'REJECT', 'EDIT_REQUIRED', 'ESCALATE']),
      moderationNotes: a.string(),
      moderationDate: a.datetime(),
      
      // Escalation info
      escalatedTo: a.id(),
      escalationReason: a.string(),
      escalationDate: a.datetime(),
      
      // Spam detection details
      spamScore: a.float(),
      spamIndicators: a.string().array(),
      
      // Honeypot detection
      honeypotTriggered: a.boolean().default(false),
      honeypotFields: a.string().array(),
      
      // Rate limiting info
      submissionRate: a.float(),
      rateLimitTriggered: a.boolean().default(false),
      
      // User context
      submitterId: a.id(),
      submitterIP: a.string(),
      submitterUserAgent: a.string(),
      submissionTimestamp: a.datetime(),
    })
    .secondaryIndexes((index) => [
      // GSI for status-based queries (admin queue)
      index('status')
        .sortKeys(['priority', 'createdAt'])
        .queryField('moderationQueueByStatus'),
      
      // GSI for moderator assignment
      index('moderatorId')
        .sortKeys(['status', 'createdAt'])
        .queryField('moderationQueueByModerator'),
      
      // GSI for content type filtering
      index('contentType')
        .sortKeys(['status', 'createdAt'])
        .queryField('moderationQueueByContentType'),
    ])
    .authorization((allow) => [
      allow.groups(['admin']).to(['create', 'read', 'update', 'delete']),
      allow.groups(['moderator']).to(['read', 'update']),
    ]),

  // Input types for custom mutations
  CreateListingInput: a.customType({
    name: a.string().required(),
    description: a.string().required(),
    street: a.string().required(),
    city: a.string().required(),
    state: a.string().required(),
    zipCode: a.string().required(),
    country: a.string().required(),
    latitude: a.float().required(),
    longitude: a.float().required(),
    phone: a.string(),
    email: a.string(),
    website: a.string(),
    facebook: a.string(),
    twitter: a.string(),
    instagram: a.string(),
    linkedin: a.string(),
    images: a.string().array(),
    hoursOfOperation: a.json(),
    pricingRange: a.enum(['BUDGET', 'MODERATE', 'EXPENSIVE', 'LUXURY']),
    categories: a.string().array(),
    tags: a.string().array(),
    features: a.string().array(),
    amenities: a.string().array(),
  }),

  UpdateListingInput: a.customType({
    name: a.string(),
    description: a.string(),
    street: a.string(),
    city: a.string(),
    state: a.string(),
    zipCode: a.string(),
    country: a.string(),
    latitude: a.float(),
    longitude: a.float(),
    phone: a.string(),
    email: a.string(),
    website: a.string(),
    facebook: a.string(),
    twitter: a.string(),
    instagram: a.string(),
    linkedin: a.string(),
    images: a.string().array(),
    hoursOfOperation: a.json(),
    pricingRange: a.enum(['BUDGET', 'MODERATE', 'EXPENSIVE', 'LUXURY']),
    categories: a.string().array(),
    tags: a.string().array(),
    features: a.string().array(),
    amenities: a.string().array(),
    status: a.enum(['PENDING', 'PUBLISHED', 'DRAFT', 'ARCHIVED']),
  }),

  // Custom mutations for listing management
  createListing: a
    .mutation()
    .arguments({
      input: a.ref('CreateListingInput'),
    })
    .returns(a.ref('Listing'))
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.authenticated(),
    ])
    .handler(a.handler.custom({ entry: './create-listing.js' })),

  updateListing: a
    .mutation()
    .arguments({
      id: a.id().required(),
      input: a.ref('UpdateListingInput'),
    })
    .returns(a.ref('Listing'))
    .authorization((allow) => [
      allow.authenticated(),
    ])
    .handler(a.handler.custom({ entry: './update-listing.js' })),

  claimListing: a
    .mutation()
    .arguments({
      listingId: a.id().required(),
      verificationData: a.json(),
    })
    .returns(a.ref('Listing'))
    .authorization((allow) => [
      allow.authenticated(),
    ])
    .handler(a.handler.custom({ entry: './claim-listing.js' })),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
