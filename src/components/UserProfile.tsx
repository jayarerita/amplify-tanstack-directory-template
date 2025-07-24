import { useState } from 'react';
import { updateUserAttributes, type UpdateUserAttributesInput } from 'aws-amplify/auth';
import { useAuth } from '~/hooks/useAuth';

export function UserProfile() {
  const { userAttributes, checkAuthState } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    given_name: userAttributes?.given_name || '',
    family_name: userAttributes?.family_name || '',
    email: userAttributes?.email || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateInput: UpdateUserAttributesInput = {
        userAttributes: {
          given_name: formData.given_name,
          family_name: formData.family_name,
          email: formData.email,
        },
      };

      await updateUserAttributes(updateInput);
      await checkAuthState(); // Refresh user attributes
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      given_name: userAttributes?.given_name || '',
      family_name: userAttributes?.family_name || '',
      email: userAttributes?.email || '',
    });
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Edit Profile
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="given_name" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  name="given_name"
                  id="given_name"
                  disabled={!isEditing}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  value={formData.given_name}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="family_name" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  name="family_name"
                  id="family_name"
                  disabled={!isEditing}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  value={formData.family_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  disabled={!isEditing}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Account Role
                </label>
                <div className="mt-1 text-sm text-gray-500">
                  {userAttributes?.['custom:role'] || 'USER'}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}