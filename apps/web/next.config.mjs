/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@panganterkini/config",
    "@panganterkini/shared-types",
    "@panganterkini/ui"
  ]
};

export default nextConfig;
