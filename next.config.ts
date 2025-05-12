import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enable static export for Firebase Hosting (basic)
  images: {
    unoptimized: true, // Required for static export when using next/image
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
  // Optional: If using static export and have dynamic routes like /invite/[code]
  // you might need to configure generateStaticParams if you know the codes beforehand,
  // or handle them purely client-side after redirecting to a generic invite page.
  // For dynamic invite codes, client-side handling is more practical.
};

export default nextConfig;
