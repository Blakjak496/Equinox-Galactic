"use client";

import { ReactNode, useEffect, useState } from "react";
import ServiceUnavailable from "@shared/ui/ServiceUnavailable/ServiceUnavailable";
import { getPublicConfig } from "@/app/api/config";

// This app is a static export (no Node server at runtime), so the service
// toggle can't be checked server-side per-request - it's fetched client-side
// on mount, then gates the route content.
export default function CartelLayout({ children }: { children: ReactNode }) {
  const [cartelEnabled, setCartelEnabled] = useState(true);

  useEffect(() => {
    getPublicConfig()
      .then((config) => setCartelEnabled(config.cartelEnabled))
      .catch(() => {});
  }, []);

  if (!cartelEnabled) {
    return <ServiceUnavailable serviceName="Equinox Cartel" />;
  }

  return <>{children}</>;
}
