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
import type { SidebarPosition, WorktreeLocation } from "@/lib/sessions";
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
  worktreeLocation: WorktreeLocation;
  onWorktreeLocationChange: (location: WorktreeLocation) => void;
  worktreeCustomPath: string;
  onWorktreeCustomPathChange: (path: string) => void;
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
  worktreeLocation,
  onWorktreeLocationChange,
  worktreeCustomPath,
  onWorktreeCustomPathChange,
  branchPrefix,
  onBranchPrefixChange,
  notificationSound,
  onNotificationSoundChange,
  updater,
}: SettingsProps) {
  const [localCommand, setLocalCommand] = useState(defaultCommand);
  const [localBranchPrefix, setLocalBranchPrefix] = useState(branchPrefix);
  const [localCustomPath, setLocalCustomPath] = useState(worktreeCustomPath);

  // Sync local input state when the persisted value changes (e.g. after store hydration on restart)
  useEffect(() => {
    setLocalCommand(defaultCommand);
  }, [defaultCommand]);

  useEffect(() => {
    setLocalBranchPrefix(branchPrefix);
  }, [branchPrefix]);

  useEffect(() => {
    setLocalCustomPath(worktreeCustomPath);
  }, [worktreeCustomPath]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (localCommand !== defaultCommand) {
        onDefaultCommandChange(localCommand.trim());
      }
      if (localBranchPrefix !== branchPrefix) {
        onBranchPrefixChange(localBranchPrefix.trim());
      }
      if (localCustomPath !== worktreeCustomPath) {
        onWorktreeCustomPathChange(localCustomPath.trim());
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
                  <button
                    className="flex items-center justify-center rounded-lg border border-border text-foreground-muted hover:bg-surface-elevated hover:text-foreground transition-colors"
                    style={{ width: 36, height: 36 }}
                    onClick={() => playNotificationSound(notificationSound)}
                    title="Preview sound"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
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
                <button
                  role="switch"
                  aria-checked={worktreeEnabled}
                  onClick={() => onWorktreeEnabledChange(!worktreeEnabled)}
                  className="relative inline-flex shrink-0 rounded-full transition-colors"
                  style={{
                    width: 36,
                    height: 20,
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
                </button>
                <span className="text-sm text-foreground">
                  Enable auto worktree creation
                </span>
              </label>

              {worktreeEnabled && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Location */}
                  <div>
                    <p className="text-xs text-foreground-muted" style={{ marginBottom: 8 }}>
                      Worktree location
                    </p>
                    <div className="flex flex-wrap" style={{ gap: 8 }}>
                      {([
                        { value: "home" as const, label: "~/.claude-worktrees" },
                        { value: "sibling" as const, label: "Sibling directory" },
                        { value: "custom" as const, label: "Custom path" },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          className={
                            "rounded-lg border text-sm transition-colors " +
                            (worktreeLocation === opt.value
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-surface-elevated text-foreground-muted hover:border-border-focus")
                          }
                          style={{ padding: "6px 14px" }}
                          onClick={() => onWorktreeLocationChange(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {worktreeLocation === "custom" && (
                      <input
                        className="w-full rounded-lg border border-border bg-surface-elevated text-sm text-foreground font-mono focus:border-primary focus:outline-none"
                        style={{ padding: "8px 12px", height: 36, marginTop: 8 }}
                        placeholder="/path/to/worktrees"
                        value={localCustomPath}
                        onChange={(e) => setLocalCustomPath(e.target.value)}
                        onBlur={() => {
                          if (localCustomPath.trim() !== worktreeCustomPath) {
                            onWorktreeCustomPathChange(localCustomPath.trim());
                          }
                        }}
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                      />
                    )}
                  </div>

                  {/* Branch prefix */}
                  <div>
                    <p className="text-xs text-foreground-muted" style={{ marginBottom: 8 }}>
                      Branch prefix
                    </p>
                    <input
                      className="w-full rounded-lg border border-border bg-surface-elevated text-sm text-foreground font-mono focus:border-primary focus:outline-none"
                      style={{ padding: "8px 12px", height: 36 }}
                      placeholder="e.g. claude/"
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
                      Branch will be named <code className="font-mono text-foreground-muted">{localBranchPrefix}ses_abc123</code>
                    </p>
                  </div>
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
