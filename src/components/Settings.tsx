import { useState, useEffect } from "react";
import { RefreshCw, Volume2 } from "lucide-react";
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
import { SOUND_OPTIONS, playNotificationSound, type NotificationSound } from "@/lib/sounds";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sidebarPosition: SidebarPosition;
  onSidebarPositionChange: (position: SidebarPosition) => void;
  defaultCommand: string;
  onDefaultCommandChange: (command: string) => void;
  defaultWorkingDir: string;
  onDefaultWorkingDirChange: (dir: string) => void;
  worktreeEnabled: boolean;
  onWorktreeEnabledChange: (enabled: boolean) => void;
  branchPrefix: string;
  onBranchPrefixChange: (prefix: string) => void;
  notificationSound: NotificationSound;
  onNotificationSoundChange: (sound: NotificationSound) => void;
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
  worktreeEnabled,
  onWorktreeEnabledChange,
  branchPrefix,
  onBranchPrefixChange,
  notificationSound,
  onNotificationSoundChange,
  updater,
}: SettingsProps) {
  const [localCommand, setLocalCommand] = useState(defaultCommand);
  const [localBranchPrefix, setLocalBranchPrefix] = useState(branchPrefix);

  // Sync local input state when the persisted value changes (e.g. after store hydration on restart)
  useEffect(() => {
    setLocalCommand(defaultCommand);
  }, [defaultCommand]);

  useEffect(() => {
    setLocalBranchPrefix(branchPrefix);
  }, [branchPrefix]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (localCommand !== defaultCommand) {
        onDefaultCommandChange(localCommand.trim());
      }
      if (localBranchPrefix !== branchPrefix) {
        onBranchPrefixChange(localBranchPrefix.trim());
      }
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
                placeholder="e.g. claude, codex, or leave empty"
                value={localCommand}
                onChange={(e) => setLocalCommand(e.target.value)}
                onBlur={() => {
                  if (localCommand.trim() !== defaultCommand) {
                    onDefaultCommandChange(localCommand.trim());
                  }
                }}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
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
                  <Button
                    key={pos}
                    variant="outline"
                    size="sm"
                    className={
                      "capitalize " +
                      (sidebarPosition === pos
                        ? "border-primary bg-primary/10 text-foreground"
                        : "")
                    }
                    style={{ padding: "6px 14px" }}
                    onClick={() => onSidebarPositionChange(pos)}
                  >
                    {pos}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notification Sound */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <h3 className="text-sm font-medium text-foreground">
                  Notification Sound
                </h3>
                <p className="text-xs text-foreground-subtle" style={{ marginTop: 4 }}>
                  Sound to play when a session needs your input.
                </p>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <select
                  className="rounded-lg border border-border bg-surface-elevated text-sm text-foreground focus:border-primary focus:outline-none"
                  style={{ padding: "6px 12px", height: 36 }}
                  value={notificationSound}
                  onChange={(e) => onNotificationSoundChange(e.target.value as NotificationSound)}
                >
                  {SOUND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {notificationSound !== "none" && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => playNotificationSound(notificationSound)}
                    title="Preview sound"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Default Working Directory */}
            <WorkingDirectoryInput
              value={defaultWorkingDir}
              onChange={onDefaultWorkingDirChange}
            />

            {/* Git Worktrees */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <h3 className="text-sm font-medium text-foreground">
                  Git Worktrees
                </h3>
                <p className="text-xs text-foreground-subtle" style={{ marginTop: 4 }}>
                  Automatically create a git worktree for each new session so work stays isolated.
                </p>
              </div>

              {/* Enable toggle */}
              <label
                className="flex items-center cursor-pointer"
                style={{ gap: 8, marginBottom: 16 }}
              >
                <Button
                  variant="ghost"
                  role="switch"
                  aria-checked={worktreeEnabled}
                  onClick={() => onWorktreeEnabledChange(!worktreeEnabled)}
                  className="relative inline-flex shrink-0 rounded-full hover:bg-transparent"
                  style={{
                    width: 36,
                    height: 20,
                    padding: 0,
                    backgroundColor: worktreeEnabled ? "var(--color-primary)" : "var(--color-border)",
                  }}
                >
                  <span
                    className="rounded-full bg-white shadow transition-transform"
                    style={{
                      width: 16,
                      height: 16,
                      margin: 2,
                      transform: worktreeEnabled ? "translateX(16px)" : "translateX(0)",
                    }}
                  />
                </Button>
                <span className="text-sm text-foreground">
                  Enable auto worktree creation
                </span>
              </label>

              {worktreeEnabled && (
                <div>
                  <p className="text-xs text-foreground-muted" style={{ marginBottom: 8 }}>
                    Branch prefix
                  </p>
                  <input
                    className="w-full rounded-lg border border-border bg-surface-elevated text-sm text-foreground font-mono focus:border-primary focus:outline-none"
                    style={{ padding: "8px 12px", height: 36 }}
                    placeholder="e.g. clutch/"
                    value={localBranchPrefix}
                    onChange={(e) => setLocalBranchPrefix(e.target.value)}
                    onBlur={() => {
                      if (localBranchPrefix.trim() !== branchPrefix) {
                        onBranchPrefixChange(localBranchPrefix.trim());
                      }
                    }}
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-foreground-subtle" style={{ marginTop: 4 }}>
                    Branch will be named <code className="font-mono text-foreground-muted">{localBranchPrefix}brave-golden-falcon</code>
                  </p>
                </div>
              )}
            </div>

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
