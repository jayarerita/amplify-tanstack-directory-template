import { createServerFn } from '@tanstack/start';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { detectSpam, type SubmissionData } from '~/utils/spam-detection';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '~/amplify/data/resource';
import { generateSitemap, generateSitemapUrls, generateRobotsTxt } from '~/utils/sitemap';
import type { Listing, Category } from '~/types';

interface GenerateUploadUrlInput {
  fileName: string;
  fileType: string;
  folder: 'listings' | 'avatars' | 'ads';
}

interface GenerateUploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

// Initialize clients
const lambdaClient = new LambdaClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

const dataClient = generateClient<Schema>();

export const generateUploadUrl = createServerFn(
  'POST',
  async (input: GenerateUploadUrlInput): Promise<GenerateUploadUrlResult> => {
    const { fileName, fileType, folder } = input;

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} is not allowed`);
    }

    // Get AWS configuration from environment
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucketName = process.env.STORAGE_BUCKET_NAME;

    if (!bucketName) {
      throw new Error('Storage bucket not configured');
    }

    const s3Client = new S3Client({ region });

    // Generate unique file key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `${folder}/anonymous/${timestamp}-${randomString}-${sanitizedFileName}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        'uploaded-by': 'anonymous',
        'upload-timestamp': timestamp.toString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    // Generate public URL (will be accessible after upload)
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;

    return {
      uploadUrl,
      fileKey,
      publicUrl,
    };
  }
);

interface ContentModerationInput {
  contentType: 'LISTING' | 'REVIEW';
  contentId: string;
  content: {
    text?: string;
    images?: string[];
  };
  submissionData?: SubmissionData;
  submitterId?: string;
}

interface ContentModerationResult {
  success: boolean;
  moderationQueueId?: string;
  autoApproved?: boolean;
  spamDetected?: boolean;
  error?: string;
}

export const triggerContentModeration = createServerFn(
  'POST',
  async (input: ContentModerationInput): Promise<ContentModerationResult> => {
    try {
      const { contentType, contentId, content, submissionData, submitterId } = input;

      // Run client-side spam detection first
      const spamResult = detectSpam(submissionData || {});
      
      if (spamResult.isSpam && spamResult.score > 0.8) {
        // Immediately reject high-confidence spam
        return {
          success: false,
          spamDetected: true,
          error: 'Content flagged as spam',
        };
      }

      // Invoke the moderation trigger Lambda function
      const command = new InvokeCommand({
        FunctionName: process.env.MODERATION_TRIGGER_FUNCTION_NAME || 'moderation-trigger',
        Payload: JSON.stringify({
          contentType,
          contentId,
          content,
          submissionData,
          submitterId,
        }),
      });

      const response = await lambdaClient.send(command);
      
      if (response.Payload) {
        const result = JSON.parse(Buffer.from(response.Payload).toString());
        return result;
      }

      return {
        success: false,
        error: 'Moderation service unavailable',
      };

    } catch (error) {
      console.error('Content moderation trigger error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
);

interface RateLimitCheckInput {
  identifier: string; // IP address or user ID
  action: 'listing_submission' | 'review_submission' | 'contact_form';
}

interface RateLimitCheckResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime?: number;
}

export const checkRateLimit = createServerFn(
  'POST',
  async (input: RateLimitCheckInput): Promise<RateLimitCheckResult> => {
    const { identifier, action } = input;
    
    // Simple in-memory rate limiting (in production, use Redis or DynamoDB)
    // This is a basic implementation for demonstration
    
    const rateLimits = {
      listing_submission: { max: 3, windowMinutes: 60 },
      review_submission: { max: 10, windowMinutes: 15 },
      contact_form: { max: 5, windowMinutes: 15 },
    };
    
    const limit = rateLimits[action];
    if (!limit) {
      return { allowed: true, remainingAttempts: 999 };
    }
    
    // In a real implementation, you would check against a persistent store
    // For now, we'll allow all requests but log the rate limit check
    console.log(`Rate limit check for ${identifier} on ${action}`);
    
    return {
      allowed: true,
      remainingAttempts: limit.max - 1,
      resetTime: Date.now() + (limit.windowMinutes * 60 * 1000),
    };
  }
);

interface WAFConfigurationInput {
  action: 'create' | 'update' | 'get';
  webAclName?: string;
}

interface WAFConfigurationResult {
  success: boolean;
  webAclArn?: string;
  webAclId?: string;
  message?: string;
  error?: string;
}

export const configureWAF = createServerFn(
  'POST',
  async (input: WAFConfigurationInput): Promise<WAFConfigurationResult> => {
    try {
      // Invoke the WAF protection Lambda function
      const command = new InvokeCommand({
        FunctionName: process.env.WAF_PROTECTION_FUNCTION_NAME || 'waf-protection',
        Payload: JSON.stringify(input),
      });

      const response = await lambdaClient.send(command);
      
      if (response.Payload) {
        const result = JSON.parse(Buffer.from(response.Payload).toString());
        return result;
      }

      return {
        success: false,
        error: 'WAF service unavailable',
      };

    } catch (error) {
      console.error('WAF configuration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
);

export const generateSitemapXml = createServerFn('GET', async () => {
  try {
    // Get all published listings
    const listingsResponse = await dataClient.models.Listing.list({
      filter: { status: { eq: 'PUBLISHED' } },
      limit: 10000, // Adjust based on your needs
    });

    // Get all active categories  
    const categoriesResponse = await dataClient.models.Category.list({
      filter: { isActive: { eq: true } },
    });

    const listings = (listingsResponse.data || []) as unknown as Listing[];
    const categories = (categoriesResponse.data || []) as unknown as Category[];

    // Get base URL from environment or use default
    const baseUrl = process.env.VITE_APP_URL || 'https://localhost:3000';

    const sitemapUrls = generateSitemapUrls(listings, categories, baseUrl);
    const sitemapXml = generateSitemap(sitemapUrls);

    return new Response(sitemapXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw new Error('Failed to generate sitemap');
  }
});

export const generateRobots = createServerFn('GET', async () => {
  try {
    const baseUrl = process.env.VITE_APP_URL || 'https://localhost:3000';
    const robotsTxt = generateRobotsTxt(baseUrl);

    return new Response(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    throw new Error('Failed to generate robots.txt');
  }
});

// Monetization Server Functions

interface CreateStripePaymentInput {
  action: 'create-subscription' | 'create-ad-payment' | 'cancel-subscription' | 'update-subscription';
  userId?: string;
  tier?: 'BRONZE' | 'SILVER' | 'GOLD';
  priceId?: string;
  paymentMethodId?: string;
  subscriptionId?: string;
  newPriceId?: string;
  adData?: {
    imageUrl: string;
    targetUrl: string;
    dimensions: string;
    placement: string;
    startDate: string;
    endDate: string;
  };
  amount?: number;
}

interface StripePaymentResult {
  success: boolean;
  subscriptionId?: string;
  clientSecret?: string;
  error?: string;
}

export const processStripePayment = createServerFn(
  'POST',
  async (input: CreateStripePaymentInput): Promise<StripePaymentResult> => {
    try {
      // Invoke the Stripe payment Lambda function
      const command = new InvokeCommand({
        FunctionName: process.env.STRIPE_PAYMENT_FUNCTION_NAME || 'stripe-payment',
        Payload: JSON.stringify(input),
      });

      const response = await lambdaClient.send(command);
      
      if (response.Payload) {
        const result = JSON.parse(Buffer.from(response.Payload).toString());
        
        if (result.statusCode === 200) {
          const body = JSON.parse(result.body);
          return {
            success: true,
            ...body,
          };
        } else {
          const errorBody = JSON.parse(result.body);
          return {
            success: false,
            error: errorBody.error || 'Payment processing failed',
          };
        }
      }

      return {
        success: false,
        error: 'Payment service unavailable',
      };

    } catch (error) {
      console.error('Stripe payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
);

interface PromoteListingInput {
  listingId: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  duration: number; // Duration in days
}

interface PromoteListingResult {
  success: boolean;
  sponsoredRank?: number;
  error?: string;
}

export const promoteListing = createServerFn(
  'POST',
  async (input: PromoteListingInput): Promise<PromoteListingResult> => {
    try {
      const { listingId, tier, duration } = input;

      // Calculate sponsored rank based on tier
      const tierRanks = {
        BRONZE: 100,
        SILVER: 200,
        GOLD: 300,
      };

      const sponsoredRank = tierRanks[tier] + Math.floor(Math.random() * 50); // Add some randomization

      // Update the listing with sponsored status
      const { data: updatedListing } = await dataClient.models.Listing.update({
        id: listingId,
        isSponsored: true,
        sponsoredTier: tier,
        sponsoredRank,
      });

      if (!updatedListing) {
        return {
          success: false,
          error: 'Failed to update listing',
        };
      }

      return {
        success: true,
        sponsoredRank,
      };

    } catch (error) {
      console.error('Listing promotion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
);

interface AdPerformanceInput {
  adId?: string;
  placement?: string;
  startDate?: string;
  endDate?: string;
}

interface AdPerformanceResult {
  success: boolean;
  data?: {
    totalImpressions: number;
    totalClicks: number;
    averageCTR: number;
    adPerformance: Array<{
      id: string;
      placement: string;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
  };
  error?: string;
}

export const getAdPerformance = createServerFn(
  'POST',
  async (input: AdPerformanceInput): Promise<AdPerformanceResult> => {
    try {
      let filter: any = {};

      if (input.adId) {
        filter.id = { eq: input.adId };
      }

      if (input.placement) {
        filter.placement = { eq: input.placement };
      }

      // Get ads based on filter
      const { data: ads } = await dataClient.models.Ad.list({ filter });

      if (!ads) {
        return {
          success: false,
          error: 'No ads found',
        };
      }

      const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
      const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
      const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      const adPerformance = ads.map(ad => ({
        id: ad.id,
        placement: ad.placement,
        impressions: ad.impressions || 0,
        clicks: ad.clicks || 0,
        ctr: (ad.impressions || 0) > 0 ? ((ad.clicks || 0) / (ad.impressions || 0)) * 100 : 0,
      }));

      return {
        success: true,
        data: {
          totalImpressions,
          totalClicks,
          averageCTR,
          adPerformance,
        },
      };

    } catch (error) {
      console.error('Ad performance retrieval error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
);

interface SubscriptionFeaturesInput {
  userId: string;
}

interface SubscriptionFeaturesResult {
  success: boolean;
  features?: string[];
  tier?: 'BRONZE' | 'SILVER' | 'GOLD';
  isActive?: boolean;
  error?: string;
}

export const getUserSubscriptionFeatures = createServerFn(
  'POST',
  async (input: SubscriptionFeaturesInput): Promise<SubscriptionFeaturesResult> => {
    try {
      const { userId } = input;

      // Get user's active subscription
      const { data: subscriptions } = await dataClient.models.Subscription.list({
        filter: {
          and: [
            { userId: { eq: userId } },
            { status: { eq: 'ACTIVE' } }
          ]
        }
      });

      const activeSubscription = subscriptions?.[0];

      if (!activeSubscription) {
        return {
          success: true,
          features: ['basic_listing'], // Default free features
          isActive: false,
        };
      }

      return {
        success: true,
        features: activeSubscription.features,
        tier: activeSubscription.tier,
        isActive: true,
      };

    } catch (error) {
      console.error('Subscription features retrieval error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
);