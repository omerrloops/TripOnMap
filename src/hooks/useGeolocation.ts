import { useState, useEffect } from 'react';

export function useGeolocation() {
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if ('geolocation' in navigator) {
            // Get initial position
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude });
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );

            // Watch position for continuous updates
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude });
                },
                (error) => {
                    // Silently handle watch errors - they're non-critical
                    console.log('Location watch unavailable:', error.code);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 10000,
                    timeout: 5000,
                }
            );

            // Cleanup: stop watching when component unmounts
            return () => {
                navigator.geolocation.clearWatch(watchId);
            };
        }
    }, []);

    return { currentLocation };
}
