import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Feast Mode Catering",
    short_name: "Feast Mode",
    description: "Delivery routes and weekly pay for Feast Mode drivers.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f1",
    theme_color: "#f4f5f1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
