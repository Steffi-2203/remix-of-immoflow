import { RefreshCw, AlertTriangle } from "lucide-react";

interface ConfigMissingProps {
  missingUrl: boolean;
  missingKey: boolean;
}

export function ConfigMissing({ missingUrl, missingKey }: ConfigMissingProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="text-center max-w-md bg-card rounded-2xl shadow-xl p-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-warning" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Backend-Konfiguration fehlt
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Die Anwendung kann momentan keine Verbindung zum Backend herstellen. 
          Dies ist in der Regel ein temporäres Problem.
        </p>

        <div className="bg-muted rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-medium text-foreground mb-2">Fehlende Konfiguration:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {missingUrl && <li>• Backend-URL nicht verfügbar</li>}
            {missingKey && <li>• API-Schlüssel nicht verfügbar</li>}
          </ul>
        </div>

        <button
          onClick={handleReload}
          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors w-full"
        >
          <RefreshCw className="h-4 w-4" />
          Seite neu laden
        </button>

        <p className="text-xs text-muted-foreground mt-4">
          Bitte versuche es in einigen Sekunden erneut. Falls das Problem weiterhin besteht, 
          wende dich an den Support.
        </p>
      </div>
    </div>
  );
}
