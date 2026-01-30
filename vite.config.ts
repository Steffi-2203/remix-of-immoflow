import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Lovable Cloud public values (publishable, safe to include in client bundle)
const LOVABLE_CLOUD_URL = "https://wvkhszullkdkokblrmud.supabase.co";
const LOVABLE_CLOUD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2a2hzenVsbGtka29rYmxybXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTcxNjQsImV4cCI6MjA4MzI3MzE2NH0.o-s453eawJX6GCxK4Ax5XyoPoPad6ushdIJJeETPvUE";

// Build-time fallbacks for Supabase env vars
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  LOVABLE_CLOUD_URL;

const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  LOVABLE_CLOUD_ANON_KEY;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Inject fallback values if VITE_* vars aren't set
    ...(supabaseUrl && {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    }),
    ...(supabaseKey && {
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
    }),
  },
}));
