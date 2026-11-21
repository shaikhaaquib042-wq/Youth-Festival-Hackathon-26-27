/** @type {import('next').NextConfig} */
const nextConfig = {
  // Edge-optimized static caching for Vercel Mumbai (bom1) edge
  images: {
    formats: ['image/webp'],
  },
  headers: async () => [
    {
      source: '/track/:path*',
      headers: [
        { key: 'Cache-Control', value: 's-maxage=10, stale-while-revalidate=5' },
      ],
    },
  ],
};

export default nextConfig;
