import type { Metadata } from "next";

import SettingsClient from "@/components/settings/SettingsClient";
import { getStreamProviders } from "@/lib/providers";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  // Resolved on the server so the client never reaches into the environment.
  return <SettingsClient providers={getStreamProviders()} />;
}
