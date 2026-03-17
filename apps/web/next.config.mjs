/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const distDir = isProduction ? '.next' : '.next-dev';

const nextConfig = {
  distDir,
  transpilePackages: ['@brainforge/types', '@brainforge/validators'],
  ...(isProduction
    ? {
        experimental: {
          optimizePackageImports: ['lucide-react', 'recharts'],
        },
      }
    : {}),
};

export default nextConfig;
