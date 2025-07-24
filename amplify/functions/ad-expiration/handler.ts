import type { ScheduledHandler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

const client = generateClient<Schema>();

export const handler: ScheduledHandler = async (event) => {
  console.log('Running ad expiration check:', event);

  try {
    const now = new Date().toISOString();

    // Find expired ads that are still active
    const { data: expiredAds } = await client.models.Ad.list({
      filter: {
        and: [
          { isActive: { eq: true } },
          { endDate: { lt: now } }
        ]
      }
    });

    console.log(`Found ${expiredAds?.length || 0} expired ads`);

    // Deactivate expired ads
    if (expiredAds && expiredAds.length > 0) {
      for (const ad of expiredAds) {
        await client.models.Ad.update({
          id: ad.id,
          isActive: false,
        });
        console.log(`Deactivated expired ad: ${ad.id}`);
      }
    }

    // Find expired sponsored listings
    const { data: expiredSponsoredListings } = await client.models.Listing.list({
      filter: {
        and: [
          { isSponsored: { eq: true } },
          // Note: We would need to add sponsoredEndDate field to Listing model
          // For now, we'll check subscriptions
        ]
      }
    });

    // Check for expired subscriptions and update sponsored status
    const { data: expiredSubscriptions } = await client.models.Subscription.list({
      filter: {
        and: [
          { status: { eq: 'ACTIVE' } },
          { currentPeriodEnd: { lt: now } }
        ]
      }
    });

    console.log(`Found ${expiredSubscriptions?.length || 0} expired subscriptions`);

    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      for (const subscription of expiredSubscriptions) {
        // Update subscription status
        await client.models.Subscription.update({
          id: subscription.id,
          status: 'PAST_DUE',
        });

        // Remove sponsored status from user's listings
        const { data: userListings } = await client.models.Listing.list({
          filter: {
            and: [
              { ownerId: { eq: subscription.userId } },
              { isSponsored: { eq: true } }
            ]
          }
        });

        if (userListings && userListings.length > 0) {
          for (const listing of userListings) {
            await client.models.Listing.update({
              id: listing.id,
              isSponsored: false,
              sponsoredRank: null,
              sponsoredTier: null,
            });
            console.log(`Removed sponsored status from listing: ${listing.id}`);
          }
        }

        console.log(`Updated expired subscription: ${subscription.id}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ad expiration check completed',
        expiredAds: expiredAds?.length || 0,
        expiredSubscriptions: expiredSubscriptions?.length || 0,
      }),
    };
  } catch (error) {
    console.error('Ad expiration check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process ad expiration' }),
    };
  }
};