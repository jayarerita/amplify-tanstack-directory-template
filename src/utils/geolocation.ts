export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

/**
 * Get the user's current location using the Geolocation API
 */
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser.',
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000, // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = 'An unknown error occurred.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }

        reject({
          code: error.code,
          message,
        });
      },
      options
    );
  });
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)} ft`;
  } else if (distance < 1) {
    return `${(distance * 5280).toFixed(0)} ft`;
  } else {
    return `${distance.toFixed(1)} mi`;
  }
}

/**
 * Get a readable location string from coordinates (simplified)
 * In a real app, you would use a reverse geocoding service
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  // This is a placeholder implementation
  // In a real app, you would use a service like Google Maps Geocoding API
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Geocode an address to coordinates (simplified)
 * In a real app, you would use a geocoding service
 */
export async function geocodeAddress(address: string): Promise<GeolocationPosition | null> {
  // This is a placeholder implementation
  // In a real app, you would use a service like Google Maps Geocoding API
  console.log('Geocoding address:', address);
  return null;
}