import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/categories/')({
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Browse Categories</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder categories */}
        {[
          'Restaurants',
          'Shopping',
          'Services',
          'Healthcare',
          'Entertainment',
          'Automotive',
        ].map((category) => (
          <div key={category} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">{category}</h2>
            <p className="text-gray-600 mb-4">Explore {category.toLowerCase()} in your area</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              View Listings →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}