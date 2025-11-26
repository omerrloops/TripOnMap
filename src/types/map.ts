export type MarkerData = {
    lat: number;
    lng: number;
    id: string;
    description?: string;
    date?: string;
    color?: string;
    category?: string;
    locationName?: string;
    photos?: { url: string; name: string }[]
};
