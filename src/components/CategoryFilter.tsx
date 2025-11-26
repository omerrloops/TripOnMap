import React from 'react';
import { CATEGORIES, CategoryKey } from '../constants/categories';
import { MarkerData } from '../types/map';

interface CategoryFilterProps {
    isOpen: boolean;
    activeCategories: Set<string>;
    setActiveCategories: (categories: Set<string>) => void;
    markers: MarkerData[];
}

export default function CategoryFilter({ isOpen, activeCategories, setActiveCategories, markers }: CategoryFilterProps) {
    return (
        <div className={`fixed top-20 right-20 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 max-w-xs transition-all duration-300 origin-right ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-8 pointer-events-none'
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
    );
}
