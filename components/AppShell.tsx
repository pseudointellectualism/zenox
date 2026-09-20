"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalonePage =
    pathname?.startsWith("/media") ||
    pathname?.startsWith("/watch") ||
    pathname?.startsWith("/admin") ||
    (typeof window !== "undefined" &&
      (window.location.hostname.startsWith("kim.") ||
        window.location.hostname.startsWith("analytics.")));

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
