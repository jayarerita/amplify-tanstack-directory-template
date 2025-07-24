import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { client } from '~/lib/data';
import { formatDate } from '~/utils/formatting';

interface VersionHistoryProps {
  listingId: string;
  currentVersion: number;
}

interface ListingVersion {
  id: string;
  listingId: string;
  version: number;
  changes: any;
  changedBy: string;
  changeType: 'CREATE' | 'UPDATE' | 'CLAIM' | 'STATUS_CHANGE';
  previousData?: any;
  changeDescription?: string;
  createdAt: string;
}

export function VersionHistory({ listingId, currentVersion }: VersionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: versionsResponse, isLoading } = useQuery({
    queryKey: ['listing-versions', listingId],
    queryFn: async () => {
      return await client.models.ListingVersion.versionsByListing({
        listingId,
        sortDirection: 'DESC', // Most recent first
      });
    },
    enabled: isExpanded, // Only fetch when expanded
  });

  const versions = versionsResponse?.data || [];

  if (!isExpanded) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          View Version History ({currentVersion} versions)
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Version History</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Hide
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No version history available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <VersionItem key={version.id} version={version} />
          ))}
        </div>
      )}
    </div>
  );
}

function VersionItem({ version }: { version: ListingVersion }) {
  const [showDetails, setShowDetails] = useState(false);

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'CREATE':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'UPDATE':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case 'CLAIM':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      case 'STATUS_CHANGE':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'CREATE': return 'Created';
      case 'UPDATE': return 'Updated';
      case 'CLAIM': return 'Claimed';
      case 'STATUS_CHANGE': return 'Status Changed';
      default: return changeType;
    }
  };

  const getChangeSummary = (changes: any, changeType: string) => {
    if (changeType === 'CREATE') {
      return 'Listing created';
    }
    
    if (changeType === 'CLAIM') {
      return 'Listing claimed by owner';
    }
    
    if (changeType === 'STATUS_CHANGE') {
      return `Status changed to ${changes.status || 'unknown'}`;
    }
    
    if (changeType === 'UPDATE' && changes) {
      const changedFields = Object.keys(changes).filter(key => 
        key !== 'updatedAt' && key !== 'version'
      );
      
      if (changedFields.length === 0) {
        return 'Minor update';
      }
      
      if (changedFields.length === 1) {
        return `Updated ${changedFields[0]}`;
      }
      
      if (changedFields.length <= 3) {
        return `Updated ${changedFields.join(', ')}`;
      }
      
      return `Updated ${changedFields.length} fields`;
    }
    
    return 'Changes made';
  };

  return (
    <div className="flex space-x-3 p-4 bg-gray-50 rounded-lg">
      {getChangeTypeIcon(version.changeType)}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Version {version.version} - {getChangeTypeLabel(version.changeType)}
            </p>
            <p className="text-sm text-gray-500">
              {getChangeSummary(version.changes, version.changeType)}
            </p>
            {version.changeDescription && (
              <p className="text-sm text-gray-600 mt-1">
                {version.changeDescription}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              {formatDate(version.createdAt)}
            </p>
            {version.changes && Object.keys(version.changes).length > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
            )}
          </div>
        </div>
        
        {showDetails && version.changes && (
          <div className="mt-3 p-3 bg-white rounded border">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Changes Made:</h4>
            <div className="space-y-1">
              {Object.entries(version.changes).map(([field, value]) => {
                if (field === 'updatedAt' || field === 'version') return null;
                
                return (
                  <div key={field} className="text-xs">
                    <span className="font-medium text-gray-600">{field}:</span>
                    <span className="ml-2 text-gray-800">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}