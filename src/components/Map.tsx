'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, ZoomControl } from 'react-leaflet';
import { useState, useEffect, useRef, useMemo } from 'react';
import LocationModal from './LocationModal';
import MemoryBook from './MemoryBook';
import Timeline from './Timeline';
import { supabase } from '../../lib/supabase';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { CATEGORIES } from '../constants/categories';
import { MarkerData } from '../types/map';
import MapControls from './MapControls';
import CategoryFilter from './CategoryFilter';
import SearchBox from './SearchBox';
import { useMarkerData } from '../hooks/useMarkerData';
import { useGeolocation } from '../hooks/useGeolocation';

let L: any;
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    L = require('leaflet');
}

// Override Leaflet's default icon to prevent red markers from appearing
if (L) {
    L.Icon.Default.prototype.options.iconUrl = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    L.Icon.Default.prototype.options.iconRetinaUrl = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    L.Icon.Default.prototype.options.shadowUrl = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
}

// Component to handle map clicks
function MapEvents({ onMapClick, setMap }: { onMapClick: (e: any) => void; setMap: (map: any) => void }) {
    const map = useMapEvents({
        click: (e) => {
            // Don't open modal if clicking on a marker or cluster
            const target = (e.originalEvent as any).target;
            if (target && (
                target.closest('.leaflet-marker-icon') ||
                target.closest('.marker-cluster') ||
                target.closest('.custom-cluster-icon') ||
                target.closest('.photo-marker-container')
            )) {
                return;
            }
            onMapClick(e);
        },
    });

    // Capture map instance
    useEffect(() => {
        setMap(map);
    }, [map, setMap]);

    return null;
}

export default function Map() {
    const { markers, setMarkers, isLoadingMarkers } = useMarkerData();
    const { currentLocation } = useGeolocation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedMemory, setSelectedMemory] = useState<MarkerData | null>(null);
    const [editingMarker, setEditingMarker] = useState<MarkerData | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [mapInstance, setMapInstance] = useState<any>(null);
    const hasInitiallyFitBounds = useRef(false);
    const [showRoute, setShowRoute] = useState(true);
    const [currentMapStyle, setCurrentMapStyle] = useState('english');

    const MAP_STYLES: { [key: string]: { url: string, attribution: string } } = {
        english: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        },
        local: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
    };
    const [timelineIndex, setTimelineIndex] = useState(-1); // -1 means show all
    const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORIES)));
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Calculate initial center and zoom from markers
    const { center, zoom } = useMemo(() => {
        if (markers.length === 0) {
            return { center: [42.7339, 25.4858] as [number, number], zoom: 10 };
        }
        // Calculate bounds from markers
        const lats = markers.map(m => m.lat);
        const lngs = markers.map(m => m.lng);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        return { center: [centerLat, centerLng] as [number, number], zoom: 10 };
    }, [markers]);



    // Focus map on timeline navigation
    useEffect(() => {
        if (!mapInstance || markers.length === 0) return;

        if (timelineIndex >= 0) {
            // Sort markers by date to match timeline order
            const sortedMarkers = [...markers].sort((a, b) =>
                new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
            );

            const targetMarker = sortedMarkers[timelineIndex];
            if (targetMarker) {
                // Use flyTo for smooth animated transitions
                mapInstance.flyTo([targetMarker.lat, targetMarker.lng], 18, {
                    duration: 1.5,
                    easeLinearity: 0.25
                });
            }
        } else {
            // If showing all events (-1), fit bounds to show all markers
            if (markers.length > 0) {
                const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));

                // Use instant fitBounds on initial load, animated flyToBounds for user navigation
                if (!hasInitiallyFitBounds.current) {
                    mapInstance.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 12
                    });
                    hasInitiallyFitBounds.current = true;
                } else {
                    mapInstance.flyToBounds(bounds, {
                        padding: [50, 50],
                        duration: 1.5,
                        maxZoom: 12
                    });
                }
            }
        }
    }, [timelineIndex, mapInstance, markers]);



    const handleMapClick = (e: L.LeafletMouseEvent) => {
        setTempLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (data: any) => {
        const { description, date, color, category, locationName, files, photoNames, lat, lng } = data;

        // Handle edit mode
        if (isEditMode && editingMarker) {
            // Upload new photos to Supabase storage
            const uploadedPhotos: { url: string; name: string }[] = [];
            let uploadedCount = 0;
            const totalFiles = (files?.length || 0) + (data.videos?.length || 0);

            if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileName = photoNames && photoNames[i] ? photoNames[i] : file.name;
                    const filePath = `${Date.now()}_${file.name}`;
                    const { error: uploadError } = await supabase.storage
                        .from('trip_photos')
                        .upload(filePath, file);
                    if (uploadError) {
                        console.error('Photo upload error:', uploadError);
                        continue;
                    }
                    const { data: urlData } = supabase.storage.from('trip_photos').getPublicUrl(filePath);
                    uploadedPhotos.push({ url: urlData.publicUrl, name: fileName });

                    uploadedCount++;
                    if (data.onUploadProgress) {
                        data.onUploadProgress(uploadedCount, totalFiles);
                    }
                }
            }

            // Merge existing photos with new uploads
            const existingPhotos = data.existingPhotos || editingMarker.photos || [];
            // Upload new videos
            const uploadedVideos = [];
            if (data.videos && data.videos.length > 0) {
                for (let i = 0; i < data.videos.length; i++) {
                    const file = data.videos[i];
                    const name = data.videoNames[i] || file.name;
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('trip_photos') // Reusing trip_photos bucket for videos
                        .upload(filePath, file);

                    if (uploadError) {
                        console.error('Error uploading video:', uploadError);
                        continue;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('trip_photos')
                        .getPublicUrl(filePath);

                    uploadedVideos.push({ url: publicUrl, name });

                    uploadedCount++;
                    if (data.onUploadProgress) {
                        data.onUploadProgress(uploadedCount, totalFiles);
                    }
                }
            }

            const allPhotos = [...(data.existingPhotos || []), ...uploadedPhotos];
            const allVideos = [...(data.existingVideos || []), ...uploadedVideos];

            const locationData = {
                lat: data.lat,
                lng: data.lng,
                description: data.description,
                date: data.date,
                category: data.category,
                color: data.color,
                location_name: data.locationName,
                photos: allPhotos,
                videos: allVideos
            };
            // Update location in Supabase
            const { error: updateError } = await supabase
                .from('locations')
                .update(locationData)
                .eq('id', editingMarker.id);

            if (updateError) {
                console.error('Error updating location:', updateError);
            } else {
                console.log('Location updated successfully');
                // Update markers state
                setMarkers((prev) =>
                    prev.map((m) =>
                        m.id === editingMarker.id
                            ? { ...m, description, date, color, category, locationName, photos: allPhotos }
                            : m
                    )
                );
            }

            setIsModalOpen(false);
            setEditingMarker(null);
            setIsEditMode(false);
            return;
        }

        // Handle create mode
        if (!tempLocation) return;
        const { description: desc, date: dt, color: col, category: cat, files: fls, photoNames: pNames } = data;
        // Upload photos to Supabase storage
        const uploadedPhotos: { url: string; name: string }[] = [];
        let uploadedCount = 0;
        const totalFiles = (fls?.length || 0) + (data.videos?.length || 0);

        if (fls && fls.length > 0) {
            for (let i = 0; i < fls.length; i++) {
                const file = fls[i];
                const fileName = pNames && pNames[i] ? pNames[i] : file.name;
                const filePath = `${Date.now()}_${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('trip_photos')
                    .upload(filePath, file);
                if (uploadError) {
                    console.error('Photo upload error:', uploadError);
                    continue;
                }
                const { data: urlData } = supabase.storage.from('trip_photos').getPublicUrl(filePath);
                uploadedPhotos.push({ url: urlData.publicUrl, name: fileName });

                uploadedCount++;
                if (data.onUploadProgress) {
                    data.onUploadProgress(uploadedCount, totalFiles);
                }
            }
        }

        // Upload videos to Supabase storage
        const uploadedVideos: { url: string; name: string }[] = [];
        if (data.videos && data.videos.length > 0) {
            for (let i = 0; i < data.videos.length; i++) {
                const file = data.videos[i];
                const name = data.videoNames[i] || file.name;
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('trip_photos')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Video upload error:', uploadError);
                    continue;
                }

                const { data: urlData } = supabase.storage.from('trip_photos').getPublicUrl(filePath);
                uploadedVideos.push({ url: urlData.publicUrl, name });

                uploadedCount++;
                if (data.onUploadProgress) {
                    data.onUploadProgress(uploadedCount, totalFiles);
                }
            }
        }

        const newMarker: MarkerData = {
            lat: tempLocation.lat,
            lng: tempLocation.lng,
            id: Math.random().toString(36).substr(2, 9),
            description: desc,
            date: dt,
            color: col,
            category: cat,
            photos: uploadedPhotos,
            videos: uploadedVideos,
        };
        setMarkers((prev) => [...prev, newMarker]);

        // Save location + photos + videos to Supabase table
        const { error: insertError } = await supabase.from('locations').insert({
            lat: tempLocation.lat,
            lng: tempLocation.lng,
            description: desc,
            date: dt,
            color: col,
            category: cat,
            location_name: locationName,
            photos: uploadedPhotos,
            videos: uploadedVideos,
        });
        if (insertError) {
            console.error('Error inserting location:', insertError);
        } else {
            console.log('Location saved with photos');
        }

        setIsModalOpen(false);
        setTempLocation(null);
    };

    const openMemory = (marker: MarkerData) => {
        setSelectedMemory(marker);
    };

    const closeMemory = () => {
        setSelectedMemory(null);
    };

    const handleEditMemory = () => {
        if (selectedMemory) {
            setEditingMarker(selectedMemory);
            setIsEditMode(true);
            setIsModalOpen(true);
            setSelectedMemory(null);
        }
    };

    const handleDeleteMemory = async () => {
        if (!selectedMemory) return;

        // Confirmation dialog
        if (!confirm(`Are you sure you want to delete this memory from ${selectedMemory.date}?`)) {
            return;
        }

        // Delete associated photos from storage
        if (selectedMemory.photos && selectedMemory.photos.length > 0) {
            for (const photo of selectedMemory.photos) {
                // Extract file path from URL
                // URL format: https://[project].supabase.co/storage/v1/object/public/trip_photos/[filepath]
                const urlParts = photo.url.split('/trip_photos/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    const { error: storageError } = await supabase.storage
                        .from('trip_photos')
                        .remove([filePath]);

                    if (storageError) {
                        console.error('Error deleting photo from storage:', storageError);
                        // Continue with deletion even if photo removal fails
                    }
                }
            }
        }

        // Delete from Supabase database
        const { error } = await supabase
            .from('locations')
            .delete()
            .eq('id', selectedMemory.id);

        if (error) {
            console.error('Error deleting location:', error);
            alert('Failed to delete the event. Please try again.');
            return;
        }

        // Remove from local state
        setMarkers((prev) => prev.filter((m) => m.id !== selectedMemory.id));

        // Close the modal
        setSelectedMemory(null);
    };

    const handleSearchSelect = (marker: MarkerData) => {
        if (mapInstance) {
            mapInstance.flyTo([marker.lat, marker.lng], 18, {
                duration: 1.5,
                easeLinearity: 0.25
            });
            // Open the memory book for this marker
            setSelectedMemory(marker);
        }
    };

    const handleQuickAdd = () => {
        if (currentLocation) {
            setTempLocation(currentLocation);
            setIsModalOpen(true);
        } else {
            alert('Waiting for GPS location. Please try again in a moment.');
        }
    };

    return (
        <>
            {isLoadingMarkers ? (
                <div className="w-full h-screen flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading map...</p>
                    </div>
                </div>
            ) : (
                <MapContainer
                    center={center}
                    zoom={zoom}
                    scrollWheelZoom={true}
                    className="w-full h-full"
                    zoomControl={false}
                >
                    <ZoomControl position="bottomright" />
                    <TileLayer
                        attribution={MAP_STYLES[currentMapStyle].attribution}
                        url={MAP_STYLES[currentMapStyle].url}
                    />
                    <MapEvents onMapClick={handleMapClick} setMap={setMapInstance} />



                    {/* Route line connecting markers chronologically */}
                    {showRoute && markers.length > 1 && (
                        <Polyline
                            positions={markers
                                .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())
                                .slice(0, timelineIndex === -1 ? markers.length : timelineIndex + 1)
                                .map(m => [m.lat, m.lng])}
                            pathOptions={{
                                color: '#6366f1',
                                weight: 3,
                                opacity: 0.7,
                                dashArray: '10, 10',
                                lineCap: 'round',
                                lineJoin: 'round',
                            }}
                        />
                    )}


                    {/* Markers with photo fan-out and clustering */}
                    <MarkerClusterGroup
                        chunkedLoading
                        animate={false}
                        animateAddingMarkers={false}
                        maxClusterRadius={60}
                        spiderfyOnMaxZoom={false}
                        showCoverageOnHover={false}
                        zoomToBoundsOnClick={true}
                        iconCreateFunction={(cluster: any) => {
                            const childMarkers = cluster.getAllChildMarkers();
                            const count = childMarkers.length;

                            // Collect up to 5 photos, one from each event
                            const photos: string[] = [];
                            for (const child of childMarkers) {
                                if (photos.length >= 5) break;
                                const markerData = markers.find(m =>
                                    m.lat === child.getLatLng().lat && m.lng === child.getLatLng().lng
                                );
                                if (markerData?.photos && markerData.photos.length > 0) {
                                    photos.push(markerData.photos[0].url);
                                }
                            }

                            // Create photo collage HTML
                            const photoHTML = photos.length > 0
                                ? photos.map((url, i) => `
                                <div style="
                                    position: absolute;
                                    width: ${photos.length === 1 ? '100%' : '50%'};
                                    height: ${photos.length <= 2 ? '100%' : '50%'};
                                    ${i === 0 ? 'top: 0; left: 0;' : ''}
                                    ${i === 1 && photos.length === 2 ? 'top: 0; right: 0;' : ''}
                                    ${i === 1 && photos.length > 2 ? 'top: 0; right: 0;' : ''}
                                    ${i === 2 ? 'bottom: 0; left: 0;' : ''}
                                    ${i === 3 ? 'bottom: 0; right: 0;' : ''}
                                    ${i === 4 ? 'bottom: 0; left: 25%; width: 50%;' : ''}
                                    overflow: hidden;
                                ">
                                    <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" />
                                </div>
                            `).join('')
                                : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px;">📍</div>`;

                            // Create fan-out HTML for hover state
                            const fanHTML = photos.map((url, index) => {
                                const rotation = (index - Math.floor(photos.length / 2)) * 20; // Increased spacing (15 -> 20)
                                // Higher pop-up: -45px base (was -30px)
                                const translateY = -45 - (Math.abs(index - Math.floor(photos.length / 2)) * 5);
                                return `
                                <div class="cluster-fan-photo" style="
                                    --rotation: ${rotation}deg;
                                    --translateY: ${translateY}px;
                                    position: absolute;
                                    width: 60px;
                                    height: 60px;
                                    border-radius: 8px;
                                    border: 2px solid white;
                                    overflow: hidden;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                                    transition: all 0.3s ease;
                                    opacity: 0;
                                    pointer-events: none;
                                    z-index: ${10 - index};
                                    left: 0;
                                    top: 0;
                                ">
                                    <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" />
                                </div>
                            `;
                            }).join('');

                            return L.divIcon({
                                html: `
                                <div class="cluster-container" style="position: relative; width: 60px; height: 60px;">
                                    <div class="cluster-collage" style="
                                        position: relative;
                                        width: 60px;
                                        height: 60px;
                                        border-radius: 50%;
                                        overflow: hidden;
                                        border: 3px solid #6366f1;
                                        background: white;
                                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                        transition: all 0.3s ease;
                                        z-index: 20;
                                    ">
                                        ${photoHTML}
                                    </div>
                                    <div style="
                                        position: absolute;
                                        bottom: -5px;
                                        right: -5px;
                                        background: #6366f1;
                                        color: white;
                                        border-radius: 50%;
                                        width: 24px;
                                        height: 24px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 12px;
                                        font-weight: bold;
                                        border: 2px solid white;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                        z-index: 30;
                                    ">${count}</div>
                                    ${fanHTML}
                                </div>
                            `,
                                className: 'custom-cluster-icon',
                                iconSize: [60, 60],
                                iconAnchor: [30, 30],
                            });
                        }}
                    >
                        {markers
                            .filter(marker => !marker.category || activeCategories.has(marker.category))
                            .map((marker) => {
                                // Use photo thumbnail if available, otherwise use category emoji
                                const hasPhoto = marker.photos && marker.photos.length > 0;
                                const photos = hasPhoto ? marker.photos!.slice(0, 5) : []; // Max 5 photos
                                const photoUrl = hasPhoto ? marker.photos![0].url : '';
                                const categoryEmoji = marker.category && CATEGORIES[marker.category as keyof typeof CATEGORIES]
                                    ? CATEGORIES[marker.category as keyof typeof CATEGORIES].emoji
                                    : '📍';

                                // Generate fan of photos
                                const photoFan = photos.map((photo, index) => {
                                    const rotation = (index - Math.floor(photos.length / 2)) * 20; // Increased spacing (15 -> 20)
                                    // Higher pop-up: -45px base (was -30px)
                                    const translateY = -45 - (Math.abs(index - Math.floor(photos.length / 2)) * 5);
                                    return `
                                <div class="fan-photo" style="
                                    --rotation: ${rotation}deg;
                                    --translateY: ${translateY}px;
                                    position: absolute;
                                    width: 60px;
                                    height: 60px;
                                    border-radius: 8px;
                                    border: 2px solid white;
                                    overflow: hidden;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                                    transition: all 0.3s ease;
                                    opacity: 0;
                                    pointer-events: none;
                                    z-index: ${10 - index};
                                    left: -5px;
                                    top: -5px;
                                ">
                                    <img src="${photo.url}" 
                                         style="width: 100%; height: 100%; object-fit: cover;"
                                         alt="Memory ${index + 1}"
                                    />
                                </div>
                            `;
                                }).join('');

                                const customIcon = L.divIcon({
                                    html: hasPhoto
                                        ? `<div class="photo-marker-container" style="position: relative; width: 50px; height: 50px;">
                                    <div class="photo-marker" style="
                                        width: 50px; 
                                        height: 50px; 
                                        border-radius: 50%; 
                                        border: 3px solid ${marker.color || '#ff0000'}; 
                                        overflow: hidden;
                                        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                                        background: white;
                                        transition: all 0.3s ease;
                                        cursor: pointer;
                                        position: relative;
                                        z-index: 100;
                                      ">
                                        <img src="${photoUrl}" 
                                             style="width: 100%; height: 100%; object-fit: cover;"
                                             alt="Memory"
                                        />
                                    </div>
                                    ${photoFan}
                                  </div>`
                                        : `<div class="emoji-marker" style="
                                    width: 40px; 
                                    height: 40px; 
                                    border-radius: 50%; 
                                    border: 3px solid ${marker.color || '#ff0000'}; 
                                    background: white;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 20px;
                                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                                    transition: all 0.3s ease;
                                    cursor: pointer;
                                  ">
                                    ${categoryEmoji}
                                  </div>`,
                                    className: '',
                                    iconSize: hasPhoto ? [50, 50] : [40, 40],
                                    iconAnchor: hasPhoto ? [25, 25] : [20, 20],
                                    popupAnchor: [0, hasPhoto ? -25 : -20],
                                });
                                return (
                                    <Marker
                                        key={marker.id}
                                        position={[marker.lat, marker.lng]}
                                        icon={customIcon}
                                        eventHandlers={{
                                            click: () => openMemory(marker),
                                        }}
                                    />
                                );
                            })}
                    </MarkerClusterGroup>

                    {/* Current location marker - outside cluster group */}
                    {currentLocation && L && (
                        <Marker
                            position={[currentLocation.lat, currentLocation.lng]}
                            icon={L.divIcon({
                                html: `<div style="width:20px; height:20px; background:#3b82f6; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(59,130,246,0.5);" class="pulse-marker"></div>`,
                                className: '',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10],
                            })}
                        />
                    )}
                </MapContainer>
            )}

            <SearchBox
                markers={markers}
                onSelect={handleSearchSelect}
            />

            <MapControls
                onQuickAdd={handleQuickAdd}
                onLocateMe={() => {
                    if (currentLocation && mapInstance) {
                        mapInstance.flyTo([currentLocation.lat, currentLocation.lng], 15);
                    }
                }}
                onToggleRoute={() => setShowRoute(!showRoute)}
                showRoute={showRoute}
                onToggleFilters={() => setIsFiltersOpen(!isFiltersOpen)}
                isFiltersOpen={isFiltersOpen}
                onMapStyleChange={setCurrentMapStyle}
                currentStyle={currentMapStyle}
            />

            {/* Timeline Slider */}
            <Timeline
                markers={markers}
                timelineIndex={timelineIndex}
                setTimelineIndex={setTimelineIndex}
            />

            <CategoryFilter
                isOpen={isFiltersOpen}
                activeCategories={activeCategories}
                setActiveCategories={setActiveCategories}
                markers={markers}
            />

            {/* Memory Book Modal */}
            {selectedMemory && (
                <MemoryBook
                    memory={selectedMemory}
                    onClose={closeMemory}
                    onEdit={handleEditMemory}
                    onDelete={handleDeleteMemory}
                />
            )}

            <LocationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingMarker(null);
                    setIsEditMode(false);
                }}
                onSubmit={handleModalSubmit}
                lat={editingMarker?.lat || tempLocation?.lat || 0}
                lng={editingMarker?.lng || tempLocation?.lng || 0}
                initialData={editingMarker ? {
                    description: editingMarker.description || '',
                    date: editingMarker.date || '',
                    category: editingMarker.category || 'attractions',
                    locationName: editingMarker.locationName || '',
                    photos: editingMarker.photos || []
                } : undefined}
                isEditMode={isEditMode}
            />
        </>
    );
}
