import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MarkerData } from '../types/map';

export function useMarkerData() {
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);

    useEffect(() => {
        const fetchLocations = async () => {
            const { data, error } = await supabase.from('locations').select('*');
            if (error) {
                console.error('Error fetching locations:', error);
                return;
            }
            if (data) {
                const loadedMarkers: MarkerData[] = data.map((loc: any) => ({
                    id: loc.id,
                    lat: loc.lat,
                    lng: loc.lng,
                    description: loc.description,
                    date: loc.date,
                    color: loc.color,
                    category: loc.category,
                    locationName: loc.location_name,
                    photos: loc.photos,
                }));
                setMarkers(loadedMarkers);
                setIsLoadingMarkers(false);
            }
        };
        fetchLocations();
    }, []);

    return { markers, setMarkers, isLoadingMarkers };
}
