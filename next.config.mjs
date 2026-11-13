/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["all-the-cities", "web-push"],
  async redirects() { return [{ source: "/two-of-you", destination: "/synastry", permanent: true }]; },
};
export default nextConfig;
