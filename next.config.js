// Statischer Export nur für den Capacitor-APK-Build (CAPACITOR_BUILD=1).
// Der normale Web-Build bleibt ein Server-Build mit API-Routen.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isCapacitorBuild ? { distDir: "out-next" } : {}),
  ...(isCapacitorBuild ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {})
};
module.exports = nextConfig;
