import { createFileRoute, Link } from '@tanstack/react-router';
import { SearchInterface } from '~/components/SearchInterface';
import { AdBanner, AdPlacements, AdDimensions } from '~/components/AdBanner';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  component: Home,
  head: () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';
    
    const seoTags = seo({
      title: 'Local Business Directory | Find the Best Businesses Near You',
      description: 'Discover local restaurants, services, and shops in your area. Browse reviews, get directions, and connect with businesses in your community.',
      keywords: 'local business, directory, restaurants, services, shops, reviews, business listings',
      url: baseUrl,
      canonical: baseUrl,
    });

    return {
      meta: seoTags,
    };
  },
});

function Home() {
  return (
    <div className="min-h-screen">
      {/* Top Banner Ad */}
      <div className="bg-gray-100 py-2">
        <div className="container mx-auto px-4 flex justify-center">
          <AdBanner
            placement={AdPlacements.HOMEPAGE_TOP}
            dimensions={AdDimensions.LEADERBOARD}
            className="max-w-full"
          />
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Discover Local Businesses
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Find the best restaurants, services, and shops in your area
            </p>
            <div className="max-w-2xl mx-auto">
              <SearchInterface
                placeholder="Search for businesses, services, or locations..."
                className="text-lg"
                showFilters={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Categories */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-center mb-12">Popular Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
              {[
                { name: 'Restaurants', icon: '🍽️', slug: 'restaurants' },
                { name: 'Shopping', icon: '🛍️', slug: 'shopping' },
                { name: 'Services', icon: '🔧', slug: 'services' },
                { name: 'Healthcare', icon: '🏥', slug: 'healthcare' },
                { name: 'Entertainment', icon: '🎭', slug: 'entertainment' },
                { name: 'Automotive', icon: '🚗', slug: 'automotive' },
              ].map((category) => (
                <Link
                  key={category.slug}
                  to="/categories/$categorySlug"
                  params={{ categorySlug: category.slug }}
                  className="text-center p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow group"
                >
                  <div className="text-4xl mb-3">{category.icon}</div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                    {category.name}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Sidebar Ad */}
          <div className="lg:w-80 flex justify-center">
            <AdBanner
              placement={AdPlacements.HOMEPAGE_SIDEBAR}
              dimensions={AdDimensions.RECTANGLE}
              className="sticky top-4"
            />
          </div>
        </div>
      </div>

      {/* Featured Listings */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Listings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Placeholder featured listings */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image Placeholder</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold">Sample Business {i}</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Sponsored
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    A great local business offering excellent services to the community.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-yellow-400">★★★★★</span>
                      <span className="text-gray-600 ml-2">4.8 (24 reviews)</span>
                    </div>
                    <span className="text-green-600 font-semibold">$$</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/listings"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View All Listings
            </Link>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">List Your Business</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of businesses already listed on our directory
          </p>
          <Link
            to="/listings/submit"
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            Add Your Business
          </Link>
        </div>
      </div>
    </div>
  );
}
