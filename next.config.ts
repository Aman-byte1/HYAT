import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline/",
    image: "",
    audio: "",
    video: "",
    font: "",
  }
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
};

export default withPWA(nextConfig as any);
