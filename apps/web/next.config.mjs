/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@brainforge/types', '@brainforge/validators'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
