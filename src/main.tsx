import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// Check if Supabase env vars are available before loading the app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Render config missing UI
  import("./components/ConfigMissing").then(({ ConfigMissing }) => {
    root.render(<ConfigMissing missingUrl={!supabaseUrl} missingKey={!supabaseKey} />);
  });
} else {
  // Dynamically import App to avoid triggering Supabase client before check
  import("./App").then(({ default: App }) => {
    root.render(<App />);
  });
}
