export const CATEGORIES = {
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
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
