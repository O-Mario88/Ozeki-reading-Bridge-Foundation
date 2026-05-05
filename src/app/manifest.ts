import type { MetadataRoute } from "next";

/**
 * PWA manifest for Ozeki Reading Bridge Foundation.
 *
 * The portal is the data-entry workflow (assessments, observations,
 * coaching visits, contact logging), so the manifest declares the
 * portal as the install target — installing from a phone drops users
 * straight into /portal/login. Public marketing pages still resolve
 * normally; the manifest just changes what an installed shortcut
 * launches into.
 *
 * Icons reference the existing 512×512 PNG logo (favicon.ico is not
 * accepted by Chrome's installability checks). Browsers downscale
 * for launcher / splash usage automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/portal/login",
    name: "Ozeki Reading Bridge Foundation",
    short_name: "Ozeki RBF",
    description:
      "Data-entry app for Ozeki Reading Bridge Foundation field workers — record reading assessments, classroom observations, coaching visits, and contact updates from your phone.",
    start_url: "/portal/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#003F37",
    categories: ["education", "productivity"],
    lang: "en-UG",
    icons: [
      {
        src: "/photos/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/photos/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Reading Command Center",
        short_name: "Dashboard",
        description: "Open the staff reading dashboard",
        url: "/portal/dashboard",
      },
      {
        name: "New Assessment",
        short_name: "Assessment",
        description: "Record a learner reading assessment",
        url: "/portal/assessments?new=1",
      },
      {
        name: "New Observation",
        short_name: "Observation",
        description: "Record a classroom observation",
        url: "/portal/observations/new",
      },
      {
        name: "New Coaching Visit",
        short_name: "Visit",
        description: "Record a coaching or school visit",
        url: "/portal/visits/new",
      },
    ],
  };
}
