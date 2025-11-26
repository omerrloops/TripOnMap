'use client';

import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { CATEGORIES } from '../constants/categories';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    lat: number;
    lng: number;
    initialData?: {
        description: string;
        date: string;
        category: string;
        locationName?: string;
        photos?: { url: string; name: string }[];
    };
    isEditMode?: boolean;
}

export default function LocationModal({ isOpen, onClose, onSubmit, lat, lng, initialData, isEditMode = false }: LocationModalProps) {
    const [description, setDescription] = useState(initialData?.description || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [files, setFiles] = useState<File[]>([]);
    const [photoNames, setPhotoNames] = useState<string[]>([]);
    const [category, setCategory] = useState<keyof typeof CATEGORIES>(
        (initialData?.category as keyof typeof CATEGORIES) || 'attractions'
    );
    const [existingPhotos, setExistingPhotos] = useState<{ url: string; name: string }[]>(
        initialData?.photos || []
    );
    const [locationName, setLocationName] = useState(initialData?.locationName || '');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // Fetch location name from coordinates
    useEffect(() => {
        const fetchLocationName = async () => {
            if (!lat || !lng || initialData?.locationName) return;

            setIsLoadingLocation(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
                );
                const data = await response.json();

                // Extract meaningful location info
                const address = data.address;
                const parts = [];

                if (address.city) parts.push(address.city);
                else if (address.town) parts.push(address.town);
                else if (address.village) parts.push(address.village);

                if (address.state) parts.push(address.state);
                if (address.country) parts.push(address.country);

                const locationStr = parts.join(', ') || data.display_name;
                setLocationName(locationStr);
            } catch (error) {
                console.error('Error fetching location name:', error);
            } finally {
                setIsLoadingLocation(false);
            }
        };

        if (isOpen && !isEditMode) {
            fetchLocationName();
        }
    }, [lat, lng, isOpen, isEditMode, initialData?.locationName]);

    // Update form when initialData changes
    useEffect(() => {
        if (initialData) {
            setDescription(initialData.description || '');
            setDate(initialData.date || new Date().toISOString().split('T')[0]);
            setCategory((initialData.category as keyof typeof CATEGORIES) || 'attractions');
            setExistingPhotos(initialData.photos || []);
            setLocationName(initialData.locationName || '');
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files ? Array.from(e.target.files) : [];
        setFiles(selected);
        setPhotoNames(selected.map(f => f.name));
    };

    const handleNameChange = (index: number, name: string) => {
        const newNames = [...photoNames];
        newNames[index] = name;
        setPhotoNames(newNames);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const color = CATEGORIES[category].color;
        onSubmit({ description, date, files, photoNames, color, category, locationName, lat, lng, existingPhotos });

        // Reset form
        if (!isEditMode) {
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
            setCategory('attractions');
            setFiles([]);
            setPhotoNames([]);
            setExistingPhotos([]);
            setLocationName('');
        }
        onClose();
    };

    const removeExistingPhoto = (index: number) => {
        setExistingPhotos(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{isEditMode ? 'Edit Location' : 'Add Location'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(CATEGORIES).map(([key, { label, color, emoji }]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCategory(key as keyof typeof CATEGORIES)}
                                    className={`p-3 rounded-lg border-2 transition-all text-left ${category === key
                                        ? 'border-current shadow-lg scale-105'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    style={{
                                        borderColor: category === key ? color : undefined,
                                        backgroundColor: category === key ? `${color}15` : undefined,
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium truncate">{label}</div>
                                            {category === key && (
                                                <div
                                                    className="w-4 h-4 rounded-full mt-1"
                                                    style={{ backgroundColor: color }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder={isLoadingLocation ? "Loading location..." : "Enter location name"}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            disabled={isLoadingLocation}
                        />
                        <p className="text-xs text-gray-500 mt-1">Auto-detected from GPS or enter manually</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            rows={3}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Photos</label>

                        {/* Existing photos */}
                        {existingPhotos.length > 0 && (
                            <div className="mb-3">
                                <p className="text-xs text-gray-500 mb-2">Existing photos:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {existingPhotos.map((photo, idx) => (
                                        <div key={idx} className="relative group">
                                            <img
                                                src={photo.url}
                                                alt={photo.name}
                                                className="w-full h-24 object-cover rounded border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingPhoto(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                            <p className="text-xs text-gray-600 mt-1 truncate">{photo.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload new photos */}
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                                id="photo-upload"
                            />
                            <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                                <Upload className="mb-2 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                    {isEditMode ? 'Add more photos' : 'Click to upload photos'}
                                </span>
                            </label>
                        </div>
                        {files.map((file, idx) => (
                            <div key={idx} className="mt-2 flex items-center space-x-2">
                                <span className="text-sm text-gray-600">{file.name}</span>
                                <input
                                    type="text"
                                    placeholder="Photo name"
                                    value={photoNames[idx] || ''}
                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                    className="flex-1 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        ))}
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        {isEditMode ? 'Update Location' : 'Save Location'}
                    </button>
                </form>
            </div>
        </div>
    );
}
