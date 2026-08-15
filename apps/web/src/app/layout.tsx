import type { Metadata, Viewport } from "next";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "PanganTerkini",
  description: "MVP transparansi harga pangan Tulungagung"
};

export const viewport: Viewport = {
  themeColor: "#2f7d57",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ServiceWorkerRegister />
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
