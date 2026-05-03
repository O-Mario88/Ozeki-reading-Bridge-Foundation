import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ozeki National Literacy Intelligence Platform",
    short_name: "Ozeki NLIS",
    description:
      "Offline-capable literacy implementation data collection for trainings, visits, assessments, and evaluations.",
    start_url: "/portal/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff7235",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/favicon.ico",
        sizes: "192x192",
        type: "image/x-icon",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "512x512",
        type: "image/x-icon",
        purpose: "maskable",
      },
    ],
  };
}
