/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/lab-inventory" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
