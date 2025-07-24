import React from 'react';
import { Star, Crown, Award } from 'lucide-react';

interface SponsoredBadgeProps {
  tier?: 'BRONZE' | 'SILVER' | 'GOLD';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SponsoredBadge({ tier, size = 'md', className = '' }: SponsoredBadgeProps) {
  const getIcon = () => {
    switch (tier) {
      case 'BRONZE':
        return <Award className="w-3 h-3" />;
      case 'SILVER':
        return <Star className="w-3 h-3" />;
      case 'GOLD':
        return <Crown className="w-3 h-3" />;
      default:
        return <Star className="w-3 h-3" />;
    }
  };

  const getColors = () => {
    switch (tier) {
      case 'BRONZE':
        return 'bg-amber-600 text-white border-amber-700';
      case 'SILVER':
        return 'bg-gray-500 text-white border-gray-600';
      case 'GOLD':
        return 'bg-yellow-500 text-black border-yellow-600';
      default:
        return 'bg-blue-600 text-white border-blue-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-1.5 py-0.5 text-xs';
      case 'md':
        return 'px-2 py-1 text-sm';
      case 'lg':
        return 'px-3 py-1.5 text-base';
      default:
        return 'px-2 py-1 text-sm';
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${getColors()}
        ${getSizeClasses()}
        ${className}
      `}
    >
      {getIcon()}
      <span>
        {tier ? `${tier.charAt(0) + tier.slice(1).toLowerCase()} Sponsor` : 'Sponsored'}
      </span>
    </div>
  );
}

export function SponsoredListingCard({ children, isSponsored, sponsoredTier, className = '' }: {
  children: React.ReactNode;
  isSponsored: boolean;
  sponsoredTier?: 'BRONZE' | 'SILVER' | 'GOLD';
  className?: string;
}) {
  if (!isSponsored) {
    return <div className={className}>{children}</div>;
  }

  const getBorderColor = () => {
    switch (sponsoredTier) {
      case 'BRONZE':
        return 'border-amber-300 bg-amber-50';
      case 'SILVER':
        return 'border-gray-300 bg-gray-50';
      case 'GOLD':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-blue-300 bg-blue-50';
    }
  };

  return (
    <div className={`relative ${getBorderColor()} border-2 rounded-lg ${className}`}>
      <div className="absolute -top-2 -right-2 z-10">
        <SponsoredBadge tier={sponsoredTier} size="sm" />
      </div>
      {children}
    </div>
  );
}