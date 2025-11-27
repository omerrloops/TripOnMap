import React, { useState } from 'react';
import { MarkerData } from '../types/map';
import { CATEGORIES, CategoryKey } from '../constants/categories';

interface MemoryBookProps {
    memory: MarkerData;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function MemoryBook({ memory, onClose, onEdit, onDelete }: MemoryBookProps) {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    const media = [
        ...(memory.photos || []).map(p => ({ ...p, type: 'image' as const })),
        ...(memory.videos || []).map(v => ({ ...v, type: 'video' as const }))
    ];

    const nextMedia = () => {
        if (media.length > 0) {
            setCurrentMediaIndex((prev) => (prev + 1) % media.length);
        }
    };

    const prevMedia = () => {
        if (media.length > 0) {
            setCurrentMediaIndex((prev) =>
                prev === 0 ? media.length - 1 : prev - 1
            );
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm memory-book-overlay"
            onClick={onClose}
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
                    onClick={onEdit}
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
                    onClick={onDelete}
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
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                >
                    <span className="text-2xl text-gray-700">×</span>
                </button>

                {/* Book Content */}
                <div className="p-8 overflow-y-auto" style={{ maxHeight: '90vh' }}>
                    {/* Category Badge */}
                    {memory.category && CATEGORIES[memory.category as CategoryKey] && (
                        <div className="flex justify-center mb-4">
                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-md"
                                style={{
                                    backgroundColor: CATEGORIES[memory.category as CategoryKey].color,
                                    color: 'white'
                                }}
                            >
                                <span className="text-2xl">
                                    {CATEGORIES[memory.category as CategoryKey].emoji}
                                </span>
                                <span className="font-semibold">
                                    {CATEGORIES[memory.category as CategoryKey].label}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Date Header - Like a chapter title */}
                    <div className="text-center mb-6 border-b-2 border-amber-300 pb-4">
                        <h2 className="text-4xl font-serif text-amber-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                            {memory.date ? new Date(memory.date).toLocaleDateString('en-GB') : ''}
                        </h2>
                        {memory.locationName && (
                            <p className="text-lg text-amber-700 mb-2 flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                {memory.locationName}
                            </p>
                        )}
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto"></div>
                    </div>

                    {/* Media Gallery - The centerpiece */}
                    {media.length > 0 && (
                        <div className="mb-8">
                            <div className="relative aspect-[4/3] bg-black rounded-lg shadow-xl overflow-hidden border-8 border-white photo-frame flex items-center justify-center">
                                {media[currentMediaIndex].type === 'video' ? (
                                    <video
                                        src={media[currentMediaIndex].url}
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <img
                                        src={media[currentMediaIndex].url}
                                        alt={media[currentMediaIndex].name}
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {/* Caption on the frame (only for images or if desired for videos too) */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pointer-events-none">
                                    <p className="text-white text-center font-serif italic">
                                        {media[currentMediaIndex].name}
                                    </p>
                                </div>

                                {/* Navigation arrows */}
                                {media.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevMedia}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 z-20"
                                        >
                                            <span className="text-2xl text-gray-700">‹</span>
                                        </button>
                                        <button
                                            onClick={nextMedia}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 z-20"
                                        >
                                            <span className="text-2xl text-gray-700">›</span>
                                        </button>
                                    </>
                                )}

                                {/* Counter */}
                                {media.length > 1 && (
                                    <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-20">
                                        {currentMediaIndex + 1} / {media.length}
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail strip */}
                            {media.length > 1 && (
                                <div className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2">
                                    {media.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentMediaIndex(idx)}
                                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-4 transition-all relative ${idx === currentMediaIndex
                                                ? 'border-amber-500 scale-110 shadow-lg'
                                                : 'border-white hover:border-amber-300'
                                                }`}
                                        >
                                            {item.type === 'video' ? (
                                                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                                    <span className="text-2xl">▶️</span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={item.url}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description - Like journal entry */}
                    <div className="bg-white/50 rounded-lg p-6 shadow-inner border border-amber-200">
                        <p className="text-lg text-gray-800 leading-relaxed font-serif" style={{ fontFamily: 'Georgia, serif' }}>
                            {memory.description}
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
    );
}
