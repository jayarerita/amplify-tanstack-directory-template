import type { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

const client = generateClient<Schema>();

export const handler: Handler = async (event) => {
  try {
    console.log('Sitemap generation triggered:', event);

    // Get all published listings
    const listingsResponse = await client.models.Listing.list({
      filter: { status: { eq: 'PUBLISHED' } },
      limit: 10000, // Adjust based on your needs
    });

    // Get all active categories
    const categoriesResponse = await client.models.Category.list({
      filter: { isActive: { eq: true } },
    });

    const listings = listingsResponse.data || [];
    const categories = categoriesResponse.data || [];

    console.log(`Found ${listings.length} listings and ${categories.length} categories`);

    // In a real implementation, you would:
    // 1. Generate the sitemap XML
    // 2. Upload it to S3
    // 3. Optionally notify search engines
    
    // For now, just log the counts
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Sitemap generation completed',
        listingsCount: listings.length,
        categoriesCount: categories.length,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate sitemap',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};