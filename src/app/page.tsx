'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      Loading Map...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-full h-screen relative">
      <Map />
    </main>
  );
}

