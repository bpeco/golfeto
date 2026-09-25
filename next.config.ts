import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos de tarjeta llegan por server action (reducidas en el cliente a ~300 KB).
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
