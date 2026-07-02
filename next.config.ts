import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.16.83.113", "192.168.1.6", "10.1.30.4", "172.20.10.3", "*"],
  serverExternalPackages: ["undici"],
};

export default nextConfig;
