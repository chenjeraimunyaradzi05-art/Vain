'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with navigator API
const ConnectionBanner = dynamic(() => import('./ConnectionBanner'), {
    ssr: false,
    loading: () => null,
});

export default function ConnectionBannerWrapper() {
    return <ConnectionBanner />;
}
