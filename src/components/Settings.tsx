import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { WorkingDirectoryInput } from "./shared/WorkingDirectoryInput";
import type { SidebarPosition } from "@/lib/sessions";
import type { UseUpdaterResult } from "@/hooks/useUpdater";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sidebarPosition: SidebarPosition;
  onSidebarPositionChange: (position: SidebarPosition) => void;
  defaultCommand: string;
  onDefaultCommandChange: (command: string) => void;
  defaultWorkingDir: string;
  onDefaultWorkingDirChange: (dir: string) => void;
  updater: UseUpdaterResult;
}

export function Settings({
  open,
  onOpenChange,
  sidebarPosition,
  onSidebarPositionChange,
  defaultCommand,
  onDefaultCommandChange,
  defaultWorkingDir,
  onDefaultWorkingDirChange,
  updater,
}: SettingsProps) {
  const [localCommand, setLocalCommand] = useState(defaultCommand);

  // Sync local input state when the persisted value changes (e.g. after store hydration on restart)
  useEffect(() => {
    setLocalCommand(defaultCommand);
  }, [defaultCommand]);

  const handleOpenChange = (open: boolean) => {
    if (!open && localCommand !== defaultCommand) {
      onDefaultCommandChange(localCommand.trim());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent style={{ width: 500 }}>
        <DialogClose onClick={() => handleOpenChange(false)} />

        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Default Command */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <h3 className="text-sm font-medium text-foreground">
                  Default Command
                </h3>
                <p className="text-xs text-foreground-subtle" style={{ marginTop: 4 }}>
                  Command to run when creating new sessions. Leave empty for a plain shell.
                </p>
              </div>
              <input
                className="w-full rounded-lg border border-border bg-surface-elevated text-sm text-foreground font-mono focus:border-primary focus:outline-none"
                style={{ padding: "8px 12px", height: 36 }}
                placeholder="e.g. claude, aider, or leave empty"
                value={localCommand}
                onChange={(e) => setLocalCommand(e.target.value)}
                onBlur={() => {
                  if (localCommand.trim() !== defaultCommand) {
                    onDefaultCommandChange(localCommand.trim());
                  }
                }}
              />
            </div>

            {/* Sidebar Position */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <h3 className="text-sm font-medium text-foreground">
                  Sidebar Position
                </h3>
                <p className="text-xs text-foreground-subtle" style={{ marginTop: 4 }}>
                  Where the session list appears.
                </p>
              </div>
              <div className="flex" style={{ gap: 8 }}>
                {(["left", "right", "top", "bottom"] as const).map((pos) => (
                  <button
                    key={pos}
                    className={
                      "rounded-lg border text-sm capitalize transition-colors " +
                      (sidebarPosition === pos
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-surface-elevated text-foreground-muted hover:border-border-focus")
                    }
                    style={{ padding: "6px 14px" }}
                    onClick={() => onSidebarPositionChange(pos)}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Working Directory */}
            <WorkingDirectoryInput
              value={defaultWorkingDir}
              onChange={onDefaultWorkingDirChange}
            />

            {/* Updates */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <h3 className="text-sm font-medium text-foreground">
                  Updates
                </h3>
              </div>
              <div className="flex items-center" style={{ gap: 12 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updater.checkForUpdates()}
                  disabled={updater.status === "checking" || updater.status === "downloading"}
                >
                  {updater.status === "checking" ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check for Updates"
                  )}
                </Button>
                <span className="text-xs text-foreground-subtle">
                  v{__APP_VERSION__}
                </span>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

declare const __APP_VERSION__: string;
