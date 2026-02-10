import { AlertTriangle, CheckCircle, Download, RefreshCw } from "lucide-react";
import type { UpdateStatus } from "../hooks/useUpdater";
import { Button } from "./ui/button";

interface UpdateToastProps {
  status: UpdateStatus;
  progress: number;
  version?: string;
  error?: string | null;
  onAction: () => void;
  onDismiss: () => void;
}

const titles: Record<string, string> = {
  available: "Update Available",
  downloading: "Downloading Update",
  ready: "Update Ready",
  error: "Update Failed",
};

const icons: Record<string, React.ReactNode> = {
  available: <Download className="h-4 w-4 text-primary" />,
  downloading: <RefreshCw className="h-4 w-4 text-primary animate-spin" />,
  ready: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

export function UpdateToast({
  status,
  progress,
  version,
  error,
  onAction,
  onDismiss,
}: UpdateToastProps) {
  const descriptions: Record<string, string> = {
    available: version
      ? `Version ${version} is available`
      : "A new version is available",
    downloading: `Downloading${version ? ` v${version}` : ""}… ${progress}%`,
    ready: "Restart to apply the update",
    error: error || "An error occurred while updating",
  };

  return (
    <div
      className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg"
      style={{ width: 340, padding: 12 }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        {icons[status]}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="text-sm font-medium text-foreground">
            {titles[status]}
          </p>
          <p className="text-xs text-foreground-muted truncate">
            {descriptions[status]}
          </p>
        </div>
      </div>

      {status === "downloading" && (
        <div
          className="w-full rounded-full bg-surface-elevated overflow-hidden"
          style={{ height: 3, marginTop: 8 }}
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status !== "downloading" && (
        <div className="flex justify-end" style={{ gap: 8, marginTop: 8 }}>
          {(status === "available" || status === "error") && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              {status === "error" ? "Dismiss" : "Later"}
            </Button>
          )}
          <Button size="sm" onClick={onAction}>
            {status === "available" && "Update Now"}
            {status === "ready" && "Restart Now"}
            {status === "error" && "Try Again"}
          </Button>
        </div>
      )}
    </div>
  );
}
