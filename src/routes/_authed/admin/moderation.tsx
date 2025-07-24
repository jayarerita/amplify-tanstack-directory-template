import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '~/amplify/data/resource';
import { useState } from 'react';

const client = generateClient<Schema>();

export const Route = createFileRoute('/_authed/admin/moderation')({
  component: ModerationQueue,
});

interface ModerationItem {
  id: string;
  contentType: 'LISTING' | 'REVIEW';
  contentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  aiFlags: string[];
  aiConfidence: number;
  contentSnapshot: any;
  submissionTimestamp: string;
  submitterId?: string;
  spamScore?: number;
  honeypotTriggered: boolean;
  rateLimitTriggered: boolean;
  createdAt: string;
}

function ModerationQueue() {
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedContentType, setSelectedContentType] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch moderation queue items
  const { data: moderationItems, isLoading } = useQuery({
    queryKey: ['moderationQueue', selectedStatus, selectedContentType, selectedPriority],
    queryFn: async () => {
      try {
        const response = await client.models.ModerationQueue.list({
          filter: selectedStatus !== 'ALL' ? { status: { eq: selectedStatus as any } } : undefined,
        });
        
        let items = response.data || [];
        
        if (selectedContentType !== 'ALL') {
          items = items.filter(item => item.contentType === selectedContentType);
        }
        
        if (selectedPriority !== 'ALL') {
          items = items.filter(item => item.priority === selectedPriority);
        }
        
        return items.sort((a, b) => {
          // Sort by priority first, then by creation date
          const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } catch (error) {
        console.error('Error fetching moderation queue:', error);
        return [];
      }
    },
  });

  // Moderation decision mutation
  const moderationMutation = useMutation({
    mutationFn: async ({ 
      itemId, 
      decision, 
      notes 
    }: { 
      itemId: string; 
      decision: 'APPROVE' | 'REJECT' | 'ESCALATE'; 
      notes: string;
    }) => {
      const statusMap = {
        APPROVE: 'APPROVED',
        REJECT: 'REJECTED',
        ESCALATE: 'ESCALATED'
      };

      await client.models.ModerationQueue.update({
        id: itemId,
        status: statusMap[decision] as any,
        moderationDecision: decision,
        moderationNotes: notes,
        moderationDate: new Date().toISOString(),
      });

      // If approving content, update the original content status
      if (decision === 'APPROVE' && selectedItem) {
        if (selectedItem.contentType === 'LISTING') {
          await client.models.Listing.update({
            id: selectedItem.contentId,
            status: 'PUBLISHED'
          });
        } else if (selectedItem.contentType === 'REVIEW') {
          await client.models.Review.update({
            id: selectedItem.contentId,
            status: 'APPROVED'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderationQueue'] });
      setSelectedItem(null);
      setModerationNotes('');
    },
  });

  const handleModerationDecision = (decision: 'APPROVE' | 'REJECT' | 'ESCALATE') => {
    if (!selectedItem) return;
    
    moderationMutation.mutate({
      itemId: selectedItem.id,
      decision,
      notes: moderationNotes,
    });
  };

  // Bulk moderation mutation
  const bulkModerationMutation = useMutation({
    mutationFn: async ({ 
      itemIds, 
      decision, 
      notes 
    }: { 
      itemIds: string[]; 
      decision: 'APPROVE' | 'REJECT' | 'ESCALATE'; 
      notes: string;
    }) => {
      const statusMap = {
        APPROVE: 'APPROVED',
        REJECT: 'REJECTED',
        ESCALATE: 'ESCALATED'
      };

      // Process items in parallel
      const promises = itemIds.map(async (itemId) => {
        const item = moderationItems?.find(i => i.id === itemId);
        if (!item) return;

        await client.models.ModerationQueue.update({
          id: itemId,
          status: statusMap[decision] as any,
          moderationDecision: decision,
          moderationNotes: notes,
          moderationDate: new Date().toISOString(),
        });

        // If approving content, update the original content status
        if (decision === 'APPROVE') {
          if (item.contentType === 'LISTING') {
            await client.models.Listing.update({
              id: item.contentId,
              status: 'PUBLISHED'
            });
          } else if (item.contentType === 'REVIEW') {
            await client.models.Review.update({
              id: item.contentId,
              status: 'APPROVED'
            });
          }
        }
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderationQueue'] });
      setSelectedItems(new Set());
      setShowBulkActions(false);
      setModerationNotes('');
    },
  });

  const handleBulkAction = (decision: 'APPROVE' | 'REJECT' | 'ESCALATE') => {
    if (selectedItems.size === 0) return;
    
    bulkModerationMutation.mutate({
      itemIds: Array.from(selectedItems),
      decision,
      notes: moderationNotes,
    });
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAllItems = () => {
    if (!moderationItems) return;
    const allIds = moderationItems.map(item => item.id);
    setSelectedItems(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'APPROVED': return 'text-green-600 bg-green-50';
      case 'REJECTED': return 'text-red-600 bg-red-50';
      case 'ESCALATED': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderContentPreview = (item: ModerationItem) => {
    const content = item.contentSnapshot;
    
    if (item.contentType === 'LISTING') {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold">{content.name}</h4>
          <p className="text-sm text-gray-600 line-clamp-3">{content.description}</p>
          <div className="text-xs text-gray-500">
            {content.city}, {content.state} • {content.categories?.join(', ')}
          </div>
          {content.images && content.images.length > 0 && (
            <div className="flex space-x-2 mt-2">
              {content.images.slice(0, 3).map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="w-16 h-16 object-cover rounded"
                />
              ))}
              {content.images.length > 3 && (
                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                  +{content.images.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else if (item.contentType === 'REVIEW') {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-sm ${
                    i < (content.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-gray-600">({content.rating}/5)</span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-3">{content.comment}</p>
        </div>
      );
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Content Moderation Queue</h1>
        <div className="flex space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ESCALATED">Escalated</option>
            <option value="ALL">All Status</option>
          </select>
          <select
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="LISTING">Listings</option>
            <option value="REVIEW">Reviews</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          {selectedItems.size > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Bulk Actions ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Queue ({moderationItems?.length || 0})</h2>
            {moderationItems && moderationItems.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={selectAllItems}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                {selectedItems.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bulk Actions Panel */}
          {showBulkActions && selectedItems.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-blue-900">
                Bulk Actions for {selectedItems.size} items
              </h3>
              <textarea
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                placeholder="Add bulk moderation notes (optional)..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('APPROVE')}
                  disabled={bulkModerationMutation.isPending}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Bulk Approve
                </button>
                <button
                  onClick={() => handleBulkAction('REJECT')}
                  disabled={bulkModerationMutation.isPending}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Bulk Reject
                </button>
                <button
                  onClick={() => handleBulkAction('ESCALATE')}
                  disabled={bulkModerationMutation.isPending}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  Bulk Escalate
                </button>
                <button
                  onClick={() => setShowBulkActions(false)}
                  className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {moderationItems?.map((item) => (
              <div
                key={item.id}
                className={`p-4 border rounded-lg transition-colors ${
                  selectedItem?.id === item.id
                    ? 'border-blue-500 bg-blue-50'
                    : selectedItems.has(item.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="mt-1"
                  />
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-gray-500">{item.contentType}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {renderContentPreview(item)}
                
                {item.aiFlags && item.aiFlags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.aiFlags.slice(0, 3).map((flag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                      >
                        {flag}
                      </span>
                    ))}
                    {item.aiFlags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{item.aiFlags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                
                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  <span>AI Confidence: {((item.aiConfidence || 0) * 100).toFixed(1)}%</span>
                  {item.spamScore && (
                    <span>Spam Score: {(item.spamScore * 100).toFixed(1)}%</span>
                  )}
                  {item.honeypotTriggered && (
                    <span className="text-red-600">Honeypot Triggered</span>
                  )}
                  {item.rateLimitTriggered && (
                    <span className="text-orange-600">Rate Limited</span>
                  )}
                  </div>
                </div>
              </div>
            ))}
            
            {(!moderationItems || moderationItems.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No items in the moderation queue
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Review Details</h2>
          {selectedItem ? (
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedItem.contentType} Review
                  </h3>
                  <p className="text-sm text-gray-600">
                    Submitted {new Date(selectedItem.submissionTimestamp || selectedItem.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedItem.priority)}`}>
                    {selectedItem.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedItem.status)}`}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>

              {/* Content Preview */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Content Preview</h4>
                {renderContentPreview(selectedItem)}
              </div>

              {/* AI Analysis */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">AI Analysis</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className="text-sm font-medium">
                      {((selectedItem.aiConfidence || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  {selectedItem.aiFlags && selectedItem.aiFlags.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Flags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedItem.aiFlags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedItem.spamScore && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Spam Score:</span>
                      <span className="text-sm font-medium">
                        {(selectedItem.spamScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Indicators */}
              {(selectedItem.honeypotTriggered || selectedItem.rateLimitTriggered) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Security Indicators</h4>
                  <div className="space-y-1">
                    {selectedItem.honeypotTriggered && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <span className="text-sm">⚠️ Honeypot triggered</span>
                      </div>
                    )}
                    {selectedItem.rateLimitTriggered && (
                      <div className="flex items-center space-x-2 text-orange-600">
                        <span className="text-sm">⚠️ Rate limit exceeded</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Moderation Actions */}
              {selectedItem.status === 'PENDING' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Moderation Decision</h4>
                  <div className="space-y-3">
                    <textarea
                      value={moderationNotes}
                      onChange={(e) => setModerationNotes(e.target.value)}
                      placeholder="Add moderation notes (optional)..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleModerationDecision('APPROVE')}
                        disabled={moderationMutation.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleModerationDecision('REJECT')}
                        disabled={moderationMutation.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleModerationDecision('ESCALATE')}
                        disabled={moderationMutation.isPending}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
                      >
                        Escalate
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-6 text-center text-gray-500">
              Select an item from the queue to review
            </div>
          )}
        </div>
      </div>
    </div>
  );
}