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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Search locations..."
                        className="w-full pl-10 pr-10 py-3 rounded-lg border-2 border-gray-200 bg-white/95 backdrop-blur-sm shadow-lg focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {query && (
                        <button
                            onClick={() => {
                                setQuery('');
                                setIsOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Results dropdown */}
                {isOpen && filteredMarkers.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                        {filteredMarkers.map((marker) => (
                            <button
                                key={marker.id}
                                onClick={() => handleSelect(marker)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                                <div className="font-medium text-gray-900">{marker.locationName || 'Unnamed Location'}</div>
                                <div className="text-sm text-gray-500 truncate">{marker.description}</div>
                                <div className="text-xs text-gray-400 mt-1">{marker.date}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
