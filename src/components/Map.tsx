'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import LocationModal from './LocationModal';
import { supabase } from '../../lib/supabase';
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

    const handleLocateMe = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude });

                    // Center map on current location
                    if (mapInstance) {
                        mapInstance.setView([latitude, longitude], 13);
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get your location. Please enable location services.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
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

                {markers.map((marker) => {
                    const customIcon = L.divIcon({
                        html: `<div style="background:${marker.color || '#ff0000'}; width:24px; height:24px; border-radius:50%; border:2px solid white;"></div>`,
                        className: '',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                        popupAnchor: [0, -12],
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

            {/* Locate Me Button */}
            <button
                onClick={handleLocateMe}
                className="fixed bottom-24 right-4 z-[1000] w-14 h-14 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
                title="Show my location"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </button>

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
