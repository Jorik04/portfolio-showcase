import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.0.175",
    "rasp.jorikpi.com",
    "192.168.0.224",
    "192.168.0.157"
  ],

  experimental: {
    webpackBuildWorker: false,
    cpus: 1,
  },
};

export default nextConfig;
