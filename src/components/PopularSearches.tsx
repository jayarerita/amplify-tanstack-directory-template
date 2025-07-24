import { Link } from "@tanstack/react-router";
// Simple SVG icons to replace Heroicons
const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 010 0L21.75 9M15 9l6.75-6.75M21.75 9v6.75h-6.75"
    />
  </svg>
);

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
    />
  </svg>
);

interface PopularSearchesProps {
  className?: string;
}

export function PopularSearches({ className = "" }: PopularSearchesProps) {
  const popularSearches = [
    "restaurants",
    "coffee shops",
    "hair salons",
    "auto repair",
    "dentist",
    "pizza",
    "grocery stores",
    "gyms",
  ];

  const trendingCategories = [
    { name: "Restaurants", count: 1234, slug: "restaurants" },
    { name: "Shopping", count: 856, slug: "shopping" },
    { name: "Services", count: 642, slug: "services" },
    { name: "Healthcare", count: 423, slug: "healthcare" },
    { name: "Entertainment", count: 312, slug: "entertainment" },
    { name: "Automotive", count: 289, slug: "automotive" },
  ];

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="space-y-6">
        {/* Popular Searches */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Popular Searches
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search) => (
              <Link
                key={search}
                to="/search"
                search={{ q: search }}
                className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full transition-colors"
              >
                {search}
              </Link>
            ))}
          </div>
        </div>

        {/* Trending Categories */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUpIcon className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Trending Categories
            </h3>
          </div>

          <div className="space-y-2">
            {trendingCategories.map((category) => (
              <Link
                key={category.slug}
                to="/categories/$categorySlug"
                params={{ categorySlug: category.slug }}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors group"
              >
                <span className="text-gray-700 group-hover:text-blue-600 font-medium">
                  {category.name}
                </span>
                <span className="text-sm text-gray-500">
                  {category.count.toLocaleString()} listings
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/listings/submit"
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Add Business
            </Link>
            <Link
              to="/categories"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Browse All
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
