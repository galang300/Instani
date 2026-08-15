import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PanganTerkini",
    short_name: "PanganTerkini",
    description: "Input harga petani, peta harga, dan warning anomali.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f5ed",
    theme_color: "#2f7d57",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
