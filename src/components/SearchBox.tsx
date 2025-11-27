'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { MarkerData } from '../types/map';

interface SearchBoxProps {
    markers: MarkerData[];
    onSelect: (marker: MarkerData) => void;
}

export default function SearchBox({ markers, onSelect }: SearchBoxProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredMarkers = query.trim()
        ? markers.filter(m =>
            m.locationName?.toLowerCase().includes(query.toLowerCase()) ||
            m.description?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5) // Limit to 5 results
        : [];

    const handleSelect = (marker: MarkerData) => {
        onSelect(marker);
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div className="absolute top-4 left-4 z-[1000] w-full max-w-sm">
            <div className="relative group">
                <div className="relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center px-4 py-3">
                        <Search className="text-gray-500 mr-3" size={20} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            placeholder="Search Bulgaria Trip..."
                            className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500 text-base"
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery('');
                                    setIsOpen(false);
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Results dropdown */}
                {isOpen && filteredMarkers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden py-2">
                        {filteredMarkers.map((marker) => (
                            <button
                                key={marker.id}
                                onClick={() => handleSelect(marker)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                            >
                                <div className="mt-1 text-gray-400">
                                    <Search size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">{marker.locationName || 'Unnamed Location'}</div>
                                    <div className="text-sm text-gray-500 truncate">{marker.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
