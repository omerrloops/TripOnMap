'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import LocationModal from './LocationModal';
import { supabase } from '../../lib/supabase';
import MarkerClusterGroup from 'react-leaflet-cluster';

let L: any;
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    L = require('leaflet');
}

// Category definitions (must match LocationModal)
const CATEGORIES = {
    food: { label: 'Food & Dining', color: '#FF6B6B', emoji: '🍽️' },
    attractions: { label: 'Attractions & Sights', color: '#4ECDC4', emoji: '🏛️' },
    nature: { label: 'Nature & Outdoors', color: '#95E1D3', emoji: '🌲' },
    accommodation: { label: 'Accommodation', color: '#F38181', emoji: '🏨' },
    activities: { label: 'Activities & Fun', color: '#FFA07A', emoji: '🎯' },
    shopping: { label: 'Shopping', color: '#DDA15E', emoji: '🛍️' },
    culture: { label: 'Culture & History', color: '#9B59B6', emoji: '🎭' },
    nightlife: { label: 'Nightlife', color: '#E74C3C', emoji: '🌙' },
    transport: { label: 'Transport', color: '#3498DB', emoji: '🚗' },
    other: { label: 'Other', color: '#95A5A6', emoji: '📍' },
};

// Default icon setup (only on client)
let defaultIcon: any;
if (L) {
    const iconUrl = 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png';
    const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png';
    const shadowUrl = 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png';
    defaultIcon = L.icon({
        iconUrl,
        iconRetinaUrl,
        shadowUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = defaultIcon;
}

// Component to handle map clicks
function MapEvents({ onMapClick, setMap }: { onMapClick: (e: any) => void; setMap: (map: any) => void }) {
    const map = useMapEvents({
        click: (e) => {
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
    type MarkerData = { lat: number; lng: number; id: string; description?: string; date?: string; color?: string; category?: string; locationName?: string; photos?: { url: string; name: string }[] };
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedMemory, setSelectedMemory] = useState<MarkerData | null>(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [editingMarker, setEditingMarker] = useState<MarkerData | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapInstance, setMapInstance] = useState<any>(null);
    const hasInitiallyCentered = useRef(false);
    const [showRoute, setShowRoute] = useState(true);
    const [timelineIndex, setTimelineIndex] = useState(-1); // -1 means show all
    const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORIES)));
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Center on Bulgaria
    const center: [number, number] = [42.7339, 25.4858];
    const zoom = 10; // More zoomed out view

    // Load existing locations from Supabase
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
            }
        };
        fetchLocations();
    }, []);

    // Automatically track current location
    useEffect(() => {
        if ('geolocation' in navigator) {
            // Get initial position
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude });

                    // Center map on initial location
                    if (mapInstance) {
                        mapInstance.setView([latitude, longitude], 11); // Slightly zoomed out
                    }
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
                    console.error('Error watching location:', error);
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
    }, [mapInstance]);

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
                // Zoom level 18 to ensure we break clusters and see the specific event
                mapInstance.flyTo([targetMarker.lat, targetMarker.lng], 18, {
                    duration: 1.2, // Slightly faster for less "shaky" feel
                    easeLinearity: 0.5
                });
            }
        } else {
            // If showing all events (-1), fit bounds to show all markers
            if (markers.length > 0) {
                const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
                mapInstance.flyToBounds(bounds, {
                    padding: [50, 50],
                    duration: 1.5,
                    maxZoom: 12
                });
            }
        }
    }, [timelineIndex, mapInstance, markers]);

    // Center map when location is first obtained
    useEffect(() => {
        if (currentLocation && mapInstance && !hasInitiallyCentered.current) {
            mapInstance.setView([currentLocation.lat, currentLocation.lng], 11); // Slightly zoomed out
            hasInitiallyCentered.current = true;
        }
    }, [currentLocation, mapInstance]);

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
                }
            }

            // Merge existing photos with new uploads
            const existingPhotos = data.existingPhotos || editingMarker.photos || [];
            const allPhotos = [...existingPhotos, ...uploadedPhotos];

            // Update location in Supabase
            const { error: updateError } = await supabase
                .from('locations')
                .update({
                    description,
                    date,
                    color,
                    category,
                    location_name: locationName,
                    photos: allPhotos,
                })
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
        };
        setMarkers((prev) => [...prev, newMarker]);

        // Save location + photos to Supabase table
        const { error: insertError } = await supabase.from('locations').insert({
            lat: tempLocation.lat,
            lng: tempLocation.lng,
            description: desc,
            date: dt,
            color: col,
            category: cat,
            location_name: locationName,
            photos: uploadedPhotos,
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
        setCurrentPhotoIndex(0);
    };

    const closeMemory = () => {
        setSelectedMemory(null);
        setCurrentPhotoIndex(0);
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
        setCurrentPhotoIndex(0);
    };

    const nextPhoto = () => {
        if (selectedMemory?.photos) {
            setCurrentPhotoIndex((prev) => (prev + 1) % selectedMemory.photos!.length);
        }
    };

    const prevPhoto = () => {
        if (selectedMemory?.photos) {
            setCurrentPhotoIndex((prev) =>
                prev === 0 ? selectedMemory.photos!.length - 1 : prev - 1
            );
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
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                className="w-full h-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEvents onMapClick={handleMapClick} setMap={setMapInstance} />

                {/* Current location marker */}
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
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
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
            </MapContainer>

            {/* Quick Add Button */}
            <button
                onClick={handleQuickAdd}
                className="fixed bottom-24 left-4 z-[1000] w-14 h-14 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
                title="Add event at current location"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>



            {/* Route Toggle Button */}
            <button
                onClick={() => setShowRoute(!showRoute)}
                className={`fixed bottom-24 right-4 z-[1000] w-14 h-14 flex items-center justify-center ${showRoute ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-full shadow-lg transition-all hover:scale-110`}
                title={showRoute ? "Hide route" : "Show route"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <path d="M15 3v18" />
                    <path d="M3 15h18" />
                    <path d="M3 9h18" />
                </svg>
            </button>

            {/* Timeline Slider */}
            {markers.length > 1 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm rounded-full shadow-xl px-6 py-3 flex items-center gap-4 max-w-2xl">
                    <button
                        onClick={() => setTimelineIndex(Math.max(-1, timelineIndex - 1))}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                        disabled={timelineIndex === -1}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                        <input
                            type="range"
                            min="-1"
                            max={markers.length - 1}
                            value={timelineIndex}
                            onChange={(e) => setTimelineIndex(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((timelineIndex + 1) / markers.length) * 100}%, #e5e7eb ${((timelineIndex + 1) / markers.length) * 100}%, #e5e7eb 100%)`
                            }}
                        />
                        <div className="text-xs text-gray-600 text-center">
                            {timelineIndex === -1
                                ? `All ${markers.length} events`
                                : `Event ${timelineIndex + 1} of ${markers.length} - ${markers.sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())[timelineIndex]?.date}`
                            }
                        </div>
                    </div>

                    <button
                        onClick={() => setTimelineIndex(Math.min(markers.length - 1, timelineIndex + 1))}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                        disabled={timelineIndex === markers.length - 1}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Category Filter Toggle */}
            <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`fixed top-20 right-4 z-[1000] w-12 h-12 flex items-center justify-center ${isFiltersOpen ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'} rounded-full shadow-lg transition-all hover:scale-110`}
                title="Filter Categories"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
            </button>

            {/* Category Filters Panel */}
            <div className={`fixed top-20 right-20 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 max-w-xs transition-all duration-300 origin-right ${isFiltersOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-8 pointer-events-none'
                }`}>
                <h3 className="text-sm font-semibold mb-3 text-gray-700 whitespace-nowrap">Filter by Category</h3>
                <div className="flex flex-col gap-2">
                    {Object.entries(CATEGORIES).map(([key, { emoji, label, color }]) => {
                        const isActive = activeCategories.has(key);
                        const count = markers.filter(m => m.category === key).length;

                        return (
                            <button
                                key={key}
                                onClick={() => {
                                    const newCategories = new Set(activeCategories);
                                    if (isActive) {
                                        newCategories.delete(key);
                                    } else {
                                        newCategories.add(key);
                                    }
                                    setActiveCategories(newCategories);
                                }}
                                className={`px-3 py-2 rounded-lg border-2 transition-all text-sm flex items-center justify-between gap-3 w-full ${isActive
                                    ? 'border-current shadow-sm'
                                    : 'border-gray-200 opacity-50 hover:opacity-75'
                                    }`}
                                style={{
                                    borderColor: isActive ? color : undefined,
                                    backgroundColor: isActive ? `${color}15` : undefined,
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{emoji}</span>
                                    <span className="font-medium text-gray-700">{label}</span>
                                </div>
                                <span className="font-bold text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{count}</span>
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => setActiveCategories(new Set(Object.keys(CATEGORIES)))}
                    className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-700 font-medium border-t pt-2"
                >
                    Reset Filters
                </button>
            </div>

            {/* Memory Book Modal */}
            {selectedMemory && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm memory-book-overlay"
                    onClick={closeMemory}
                >
                    <div
                        className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden memory-book-page"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxHeight: '90vh',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
                        }}
                    >
                        {/* Edit button */}
                        <button
                            onClick={handleEditMemory}
                            className="absolute top-4 right-28 z-10 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                            title="Edit this memory"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                            </svg>
                        </button>

                        {/* Delete button */}
                        <button
                            onClick={handleDeleteMemory}
                            className="absolute top-4 right-16 z-10 w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-full shadow-lg transition-all hover:scale-110"
                            title="Delete this memory"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                <line x1="10" x2="10" y1="11" y2="17" />
                                <line x1="14" x2="14" y1="11" y2="17" />
                            </svg>
                        </button>

                        {/* Close button */}
                        <button
                            onClick={closeMemory}
                            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                        >
                            <span className="text-2xl text-gray-700">×</span>
                        </button>

                        {/* Book Content */}
                        <div className="p-8 overflow-y-auto" style={{ maxHeight: '90vh' }}>
                            {/* Category Badge */}
                            {selectedMemory.category && CATEGORIES[selectedMemory.category as keyof typeof CATEGORIES] && (
                                <div className="flex justify-center mb-4">
                                    <div
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-md"
                                        style={{
                                            backgroundColor: CATEGORIES[selectedMemory.category as keyof typeof CATEGORIES].color,
                                            color: 'white'
                                        }}
                                    >
                                        <span className="text-2xl">
                                            {CATEGORIES[selectedMemory.category as keyof typeof CATEGORIES].emoji}
                                        </span>
                                        <span className="font-semibold">
                                            {CATEGORIES[selectedMemory.category as keyof typeof CATEGORIES].label}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Date Header - Like a chapter title */}
                            <div className="text-center mb-6 border-b-2 border-amber-300 pb-4">
                                <h2 className="text-4xl font-serif text-amber-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                                    {selectedMemory.date}
                                </h2>
                                {selectedMemory.locationName && (
                                    <p className="text-lg text-amber-700 mb-2 flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                        {selectedMemory.locationName}
                                    </p>
                                )}
                                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto"></div>
                            </div>

                            {/* Photo Gallery - The centerpiece */}
                            {selectedMemory.photos && selectedMemory.photos.length > 0 && (
                                <div className="mb-8">
                                    <div className="relative aspect-[4/3] bg-white rounded-lg shadow-xl overflow-hidden border-8 border-white photo-frame">
                                        <img
                                            src={selectedMemory.photos[currentPhotoIndex].url}
                                            alt={selectedMemory.photos[currentPhotoIndex].name}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Photo caption on the frame */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                            <p className="text-white text-center font-serif italic">
                                                {selectedMemory.photos[currentPhotoIndex].name}
                                            </p>
                                        </div>

                                        {/* Navigation arrows */}
                                        {selectedMemory.photos.length > 1 && (
                                            <>
                                                <button
                                                    onClick={prevPhoto}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                                                >
                                                    <span className="text-2xl text-gray-700">‹</span>
                                                </button>
                                                <button
                                                    onClick={nextPhoto}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                                                >
                                                    <span className="text-2xl text-gray-700">›</span>
                                                </button>
                                            </>
                                        )}

                                        {/* Photo counter */}
                                        {selectedMemory.photos.length > 1 && (
                                            <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                                                {currentPhotoIndex + 1} / {selectedMemory.photos.length}
                                            </div>
                                        )}
                                    </div>

                                    {/* Thumbnail strip */}
                                    {selectedMemory.photos.length > 1 && (
                                        <div className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2">
                                            {selectedMemory.photos.map((photo, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentPhotoIndex(idx)}
                                                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-4 transition-all ${idx === currentPhotoIndex
                                                        ? 'border-amber-500 scale-110 shadow-lg'
                                                        : 'border-white hover:border-amber-300'
                                                        }`}
                                                >
                                                    <img
                                                        src={photo.url}
                                                        alt={photo.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description - Like journal entry */}
                            <div className="bg-white/50 rounded-lg p-6 shadow-inner border border-amber-200">
                                <p className="text-lg text-gray-800 leading-relaxed font-serif" style={{ fontFamily: 'Georgia, serif' }}>
                                    {selectedMemory.description}
                                </p>
                            </div>

                            {/* Decorative elements */}
                            <div className="mt-6 flex justify-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                            </div>
                        </div>
                    </div>
                </div>
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
