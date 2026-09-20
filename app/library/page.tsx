import type { Metadata } from "next";

import MyListClient from "@/components/MyListClient";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return <MyListClient />;
}
