"use client";

import { useEffect } from "react";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { app } from "../firebase";

let inited = false;

export default function AppCheckInit() {
  useEffect(() => {
    if (inited) return;
    inited = true;

    if (process.env.NODE_ENV === "development") {
      // In dev, ask Firebase to print a debug token in console
      // @ts-ignore
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string,
      ),
      isTokenAutoRefreshEnabled: true,
    });
  }, []);

  return null;
}
