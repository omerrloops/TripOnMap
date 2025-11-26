import React from 'react';

interface MapControlsProps {
    onQuickAdd: () => void;
    onLocateMe: () => void;
    onToggleRoute: () => void;
    showRoute: boolean;
    onToggleFilters: () => void;
    isFiltersOpen: boolean;
}

export default function MapControls({
    onQuickAdd,
    onLocateMe,
    onToggleRoute,
    showRoute,
    onToggleFilters,
    isFiltersOpen
}: MapControlsProps) {
    return (
        <>
            {/* Quick Add Button */}
            <button
                onClick={onQuickAdd}
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
                onClick={onLocateMe}
                className="fixed bottom-24 left-20 z-[1000] w-14 h-14 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
                title="Center on my location"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
            </button>

            {/* Route Toggle Button */}
            <button
                onClick={onToggleRoute}
                className={`fixed bottom-24 right-4 z-[1000] w-14 h-14 flex items-center justify-center ${showRoute ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-full shadow-lg transition-all hover:scale-110`}
                title={showRoute ? "Hide route" : "Show route"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="19" r="3" />
                    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
                    <circle cx="18" cy="5" r="3" />
                </svg>
            </button>

            {/* Category Filter Toggle */}
            <button
                onClick={onToggleFilters}
                className={`fixed top-20 right-4 z-[1000] w-12 h-12 flex items-center justify-center ${isFiltersOpen ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'} rounded-full shadow-lg transition-all hover:scale-110`}
                title="Filter Categories"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
            </button>
        </>
    );
}
