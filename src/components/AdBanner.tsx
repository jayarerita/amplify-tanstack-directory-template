import React, { useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface AdBannerProps {
  placement: string;
  dimensions?: string;
  className?: string;
  maxAds?: number; // Maximum number of ads to rotate through
  rotationInterval?: number; // Rotation interval in milliseconds
}

interface Ad {
  id: string;
  imageUrl: string;
  targetUrl: string;
  dimensions: string;
  placement: string;
  impressions: number;
  clicks: number;
}

export function AdBanner({ 
  placement, 
  dimensions, 
  className = '',
  maxAds = 3,
  rotationInterval = 30000 // 30 seconds
}: AdBannerProps) {
  const [ads, setAds] = React.useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [impressionTracked, setImpressionTracked] = React.useState(false);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const adElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadAds();
    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [placement]);

  useEffect(() => {
    if (ads.length > 1) {
      // Start rotation timer
      rotationTimerRef.current = setInterval(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
        setImpressionTracked(false); // Reset impression tracking for new ad
      }, rotationInterval);

      return () => {
        if (rotationTimerRef.current) {
          clearInterval(rotationTimerRef.current);
        }
      };
    }
  }, [ads, rotationInterval]);

  useEffect(() => {
    // Set up intersection observer for impression tracking
    if (adElementRef.current && ads.length > 0) {
      intersectionObserverRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !impressionTracked) {
              trackImpression(ads[currentAdIndex].id);
              setImpressionTracked(true);
            }
          });
        },
        { threshold: 0.5 } // Track when 50% of ad is visible
      );

      intersectionObserverRef.current.observe(adElementRef.current);
    }

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [ads, currentAdIndex, impressionTracked]);

  const loadAds = async () => {
    try {
      const now = new Date().toISOString();
      
      const { data: adsData } = await client.models.Ad.list({
        filter: {
          and: [
            { placement: { eq: placement } },
            { isActive: { eq: true } },
            { startDate: { lte: now } },
            { endDate: { gte: now } }
          ]
        },
        limit: maxAds
      });

      if (adsData && adsData.length > 0) {
        // Shuffle ads for random rotation
        const shuffledAds = [...adsData].sort(() => Math.random() - 0.5);
        setAds(shuffledAds as Ad[]);
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackImpression = async (adId: string) => {
    try {
      // Use optimistic update for better UX
      setAds(prevAds => 
        prevAds.map(ad => 
          ad.id === adId 
            ? { ...ad, impressions: (ad.impressions || 0) + 1 }
            : ad
        )
      );

      // Update in database
      const { data: currentAd } = await client.models.Ad.get({ id: adId });
      if (currentAd) {
        await client.models.Ad.update({
          id: adId,
          impressions: (currentAd.impressions || 0) + 1,
        });
      }
    } catch (error) {
      console.error('Error tracking impression:', error);
      // Revert optimistic update on error
      setAds(prevAds => 
        prevAds.map(ad => 
          ad.id === adId 
            ? { ...ad, impressions: Math.max(0, (ad.impressions || 0) - 1) }
            : ad
        )
      );
    }
  };

  const trackClick = async (adId: string) => {
    try {
      // Use optimistic update for better UX
      setAds(prevAds => 
        prevAds.map(ad => 
          ad.id === adId 
            ? { ...ad, clicks: (ad.clicks || 0) + 1 }
            : ad
        )
      );

      // Update in database
      await client.models.Ad.update({
        id: adId,
        clicks: (ads.find(ad => ad.id === adId)?.clicks || 0) + 1,
      });
    } catch (error) {
      console.error('Error tracking click:', error);
      // Revert optimistic update on error
      setAds(prevAds => 
        prevAds.map(ad => 
          ad.id === adId 
            ? { ...ad, clicks: Math.max(0, (ad.clicks || 0) - 1) }
            : ad
        )
      );
    }
  };

  const handleClick = (ad: Ad) => {
    trackClick(ad.id);
    window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded ${className}`}>
        <div className="h-full w-full bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!ads.length) {
    return null;
  }

  const currentAd = ads[currentAdIndex];
  const [width, height] = currentAd.dimensions.split('x').map(Number);

  return (
    <div 
      ref={adElementRef}
      className={`ad-banner ${className}`} 
      data-placement={placement}
      data-ad-id={currentAd.id}
    >
      <div className="relative group cursor-pointer" onClick={() => handleClick(currentAd)}>
        <img
          src={currentAd.imageUrl}
          alt="Advertisement"
          width={width}
          height={height}
          className="w-full h-auto rounded border border-gray-200 hover:border-gray-300 transition-colors"
          loading="lazy"
        />
        <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Ad
        </div>
        
        {/* Rotation indicator for multiple ads */}
        {ads.length > 1 && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
            {ads.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentAdIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Common ad placements
export const AdPlacements = {
  HOMEPAGE_TOP: 'homepage-top',
  HOMEPAGE_SIDEBAR: 'homepage-sidebar',
  LISTING_DETAIL_TOP: 'listing-detail-top',
  LISTING_DETAIL_SIDEBAR: 'listing-detail-sidebar',
  SEARCH_RESULTS_TOP: 'search-results-top',
  SEARCH_RESULTS_SIDEBAR: 'search-results-sidebar',
  CATEGORY_PAGE_TOP: 'category-page-top',
  CATEGORY_PAGE_SIDEBAR: 'category-page-sidebar',
} as const;

// Common ad dimensions
export const AdDimensions = {
  LEADERBOARD: '728x90',
  BANNER: '468x60',
  RECTANGLE: '300x250',
  SQUARE: '250x250',
  SKYSCRAPER: '160x600',
  WIDE_SKYSCRAPER: '300x600',
} as const;