import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Manrope, Sora } from "next/font/google";

import AppShell from "@/components/AppShell";
import AmbientBackdrop from "@/components/AmbientBackdrop";
import SettingsBridge from "@/components/SettingsBridge";
import { OverlayProvider } from "@/components/overlay/OverlayProvider";
import AnalyticsTracker from "@/components/analytics/AnalyticsTracker";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";
import { getSystemConfig } from "@/lib/server/systemConfigStore";
import { adminDomain, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Ultra-fast streaming platform for movies and series with dynamic subtitles, high-speed playback servers, and clean modern aesthetics.",
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: `${SITE_NAME} · Stream Movies & Series`,
    description: "A cinematic streaming experience with ultra-fast playback and 4K catalog.",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Streaming Platform`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · Stream Movies & Series`,
    description: "A cinematic streaming experience with ultra-fast playback and 4K catalog.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png?v=2", sizes: "64x64", type: "image/png" },
      { url: "/zenox-icon.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const pathname = headerStore.get("x-pathname") || "";
  const isAdminHost = host.toLowerCase().split(":")[0] === adminDomain();
  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/auth");

  const config = getSystemConfig();

  // Show maintenance screen on all public routes when maintenanceMode is active
  if (config.maintenanceMode && !isAdminHost && !isAdminRoute) {
    return (
      <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
        <body className="min-h-dvh bg-canvas text-white antialiased">
          <MaintenanceScreen message={config.maintenanceMessage} />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body className="min-h-dvh bg-canvas text-white antialiased">
        <AnalyticsTracker />
        <SettingsBridge />
        <AmbientBackdrop />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-primary focus:px-5 focus:py-2 focus:text-label-md focus:text-on-primary"
        >
          Skip to content
        </a>
        {/* Settings and title details open as overlays rather than routes. */}
        <OverlayProvider>
          <AppShell>{children}</AppShell>
        </OverlayProvider>
      </body>
    </html>
  );
}

