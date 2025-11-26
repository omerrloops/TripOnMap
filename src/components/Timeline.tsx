import React from 'react';
import { MarkerData } from '../types/map';

interface TimelineProps {
    markers: MarkerData[];
    timelineIndex: number;
    setTimelineIndex: (index: number) => void;
}

export default function Timeline({ markers, timelineIndex, setTimelineIndex }: TimelineProps) {
    if (markers.length <= 1) return null;

    const sortedMarkers = [...markers].sort((a, b) =>
        new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
    );

    const currentEventDate = timelineIndex >= 0 && sortedMarkers[timelineIndex]
        ? sortedMarkers[timelineIndex].date
        : '';

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm rounded-full shadow-xl px-6 py-3 flex items-center gap-4 max-w-2xl">
            <button
                onClick={() => setTimelineIndex(Math.max(-1, timelineIndex - 1))}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                disabled={timelineIndex === -1}
                title="Previous event"
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
                        : `Event ${timelineIndex + 1} of ${markers.length} - ${currentEventDate}`
                    }
                </div>
            </div>

            <button
                onClick={() => setTimelineIndex(Math.min(markers.length - 1, timelineIndex + 1))}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                disabled={timelineIndex === markers.length - 1}
                title="Next event"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
        </div>
    );
}
