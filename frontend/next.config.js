/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  distDir: ".next",
  webpack: (config) => {
    // ✅ Allow imports like "@/components/Button"
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
  // ✅ Ensure PostCSS looks inside the frontend directory during Vercel build
  postcssLoaderOptions: {
    config: path.resolve(__dirname, "postcss.config.js"),
  },
};

module.exports = nextConfig;
