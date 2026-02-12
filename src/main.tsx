import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: import.meta.env.MODE === "production" ? [Sentry.browserTracingIntegration()] : [],
  tracesSampleRate: import.meta.env.MODE === "production" ? 0.05 : 0.0,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  enabled: import.meta.env.MODE === "production" && !!import.meta.env.VITE_SENTRY_DSN,
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
