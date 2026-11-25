import { getSystemConfig } from "@/lib/server/systemConfigStore";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  const config = getSystemConfig();
  return <MaintenanceScreen message={config.maintenanceMessage} />;
}

