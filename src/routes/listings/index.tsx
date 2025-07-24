import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/listings/')({
  component: ListingsPage,
});

function ListingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Browse Listings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          {/* Search filters will go here */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <p className="text-gray-600">Search filters coming soon...</p>
          </div>
        </div>
        <div className="lg:col-span-3">
          {/* Listing results will go here */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Results</h2>
            <p className="text-gray-600">Listing results coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}