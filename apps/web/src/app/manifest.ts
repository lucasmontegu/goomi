import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Goomi",
    short_name: "Goomi",
    description: "Make your screen time add up.",
    start_url: "/",
    display: "browser",
    background_color: "#FAFAF8",
    theme_color: "#D9FF6B",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
