import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: false, // Set to false for SSR with image optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      // Allow Google profile pictures
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**', // Common path prefix for Google user content
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
