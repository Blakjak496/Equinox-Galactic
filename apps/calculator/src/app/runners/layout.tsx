"use client";

import { ReactNode, useEffect, useState } from "react";
import ServiceUnavailable from "@shared/ui/ServiceUnavailable/ServiceUnavailable";
import { getPublicConfig } from "@/app/api/config";

// This app is a static export (no Node server at runtime), so the service
// toggle can't be checked server-side per-request - it's fetched client-side
// on mount, then gates the route content.
export default function RunnersLayout({ children }: { children: ReactNode }) {
  const [runnersEnabled, setRunnersEnabled] = useState(true);

  useEffect(() => {
    getPublicConfig()
      .then((config) => setRunnersEnabled(config.runnersEnabled))
      .catch(() => {});
  }, []);

  if (!runnersEnabled) {
    return <ServiceUnavailable serviceName="Equinox Runners" />;
  }

  return <>{children}</>;
}
