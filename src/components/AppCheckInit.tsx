"use client";

import { useEffect } from "react";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { app } from "../firebase";

let appCheckInitialized = false;

export default function AppCheckInit() {
  useEffect(() => {
    if (appCheckInitialized) return;

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      console.error("Missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY");
      return;
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });

    appCheckInitialized = true;
  }, []);

  return null;
}
