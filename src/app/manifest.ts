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
    theme_color: "#fa7d15",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
