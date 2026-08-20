import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // AVIF u fotek lesa a lomu ušetří ~30 % oproti WebP; WebP zůstává jako záloha.
    formats: ["image/avif", "image/webp"],
    // Skutečné body zlomu webu — bez toho Next generuje i velikosti, které nikdy nepoužijeme.
    deviceSizes: [390, 640, 828, 1080, 1280, 1620, 1920, 2560],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
};

export default nextConfig;
