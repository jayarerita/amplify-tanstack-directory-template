import { createFileRoute } from '@tanstack/react-router';
import { seo } from '~/utils/seo';
import { generateBreadcrumbSchema, injectStructuredData } from '~/utils/structured-data';

export const Route = createFileRoute('/categories/$categorySlug')({
  component: CategoryPage,
  head: ({ params }) => {
    const categoryName = params.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';
    
    const title = `${categoryName} Businesses | Local Business Directory`;
    const description = `Find the best ${categoryName.toLowerCase()} businesses in your area. Browse reviews, get directions, and connect with local ${categoryName.toLowerCase()} services.`;
    const keywords = `${categoryName}, local ${categoryName.toLowerCase()}, ${categoryName.toLowerCase()} near me, business directory`;
    const url = `${baseUrl}/categories/${params.categorySlug}`;

    const seoTags = seo({
      title,
      description,
      keywords,
      url,
      canonical: url,
    });

    // Generate breadcrumb structured data
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Categories', url: '/categories' },
      { name: categoryName, url: `/categories/${params.categorySlug}` },
    ], baseUrl);

    return {
      meta: seoTags,
      scripts: [
        injectStructuredData(breadcrumbSchema),
      ],
    };
  },
});

function CategoryPage() {
  const { categorySlug } = Route.useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 capitalize">
        {categorySlug.replace('-', ' ')} Listings
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Refine Results</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter city or ZIP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Any Price</option>
                  <option value="BUDGET">$ Budget</option>
                  <option value="MODERATE">$$ Moderate</option>
                  <option value="EXPENSIVE">$$$ Expensive</option>
                  <option value="LUXURY">$$$$ Luxury</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">Showing results for {categorySlug}</p>
              <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="relevance">Sort by Relevance</option>
                <option value="rating">Sort by Rating</option>
                <option value="distance">Sort by Distance</option>
                <option value="newest">Sort by Newest</option>
              </select>
            </div>
            
            <div className="space-y-6">
              <p className="text-gray-600">Category listings coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}