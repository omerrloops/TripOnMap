'use client';

import { useState } from 'react';
import { X, Upload } from 'lucide-react';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    lat: number;
    lng: number;
}

// Category definitions with colors and emojis
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

export default function LocationModal({ isOpen, onClose, onSubmit, lat, lng }: LocationModalProps) {
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [files, setFiles] = useState<File[]>([]);
    const [photoNames, setPhotoNames] = useState<string[]>([]);
    const [category, setCategory] = useState<keyof typeof CATEGORIES>('attractions');

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
        onSubmit({ description, date, files, photoNames, color, category, lat, lng });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Add Location</h2>
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
                                <span className="text-sm text-gray-500">Click to upload photos</span>
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
                        Save Location
                    </button>
                </form>
            </div>
        </div>
    );
}
