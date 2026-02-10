import { ArrowLeft, RefreshCw, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { UseUpdaterResult } from "@/hooks/useUpdater";
import type { SidebarPosition } from "@/lib/sessions";
import { type NotificationSound, playNotificationSound, SOUND_OPTIONS } from "@/lib/sounds";
import { WorkingDirectoryInput } from "./shared/WorkingDirectoryInput";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface SettingsProps {
  onBack: () => void;
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
  activeSessionId?: string | null;
}

export function Settings({
  onBack,
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
  activeSessionId,
}: SettingsProps) {
  const [localCommand, setLocalCommand] = useState(defaultCommand);
  const [localBranchPrefix, setLocalBranchPrefix] = useState(branchPrefix);

  useEffect(() => {
    setLocalCommand(defaultCommand);
  }, [defaultCommand]);

  useEffect(() => {
    setLocalBranchPrefix(branchPrefix);
  }, [branchPrefix]);

  const handleBack = () => {
    if (localCommand !== defaultCommand) {
      onDefaultCommandChange(localCommand.trim());
    }
    if (localBranchPrefix !== branchPrefix) {
      onBranchPrefixChange(localBranchPrefix.trim());
    }
    onBack();
  };

  return (
    <div className="flex flex-col h-full w-full bg-surface" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div
        data-tauri-drag-region
        className="flex items-center border-b border-border bg-surface/80 backdrop-blur-md"
        style={{ height: 36, minHeight: 36, paddingLeft: 78, paddingRight: 12 }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground-muted"
          style={{ gap: 6, padding: "4px 8px", height: 28 }}
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div data-tauri-drag-region className="flex-1" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "32px 0" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 24px" }}>
          <h1 className="text-xl font-semibold text-foreground" style={{ marginBottom: 32 }}>
            Settings
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <SettingsSection
              title="Default Command"
              description="Command to run when creating new sessions. Leave empty for a plain shell."
            >
              <input
                className="w-full rounded-lg border border-border bg-surface-elevated text-base text-foreground font-mono focus:border-primary focus:outline-none"
                style={{ padding: "10px 12px", height: 40 }}
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
            </SettingsSection>

            <SettingsSection title="Sidebar Position" description="Where the session list appears.">
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
            </SettingsSection>

            <SettingsSection
              title="Notification Sound"
              description="Sound to play when a session needs your input."
            >
              <div className="flex items-center" style={{ gap: 8 }}>
                <select
                  className="rounded-lg border border-border bg-surface-elevated text-base text-foreground focus:border-primary focus:outline-none"
                  style={{ padding: "6px 12px", height: 40 }}
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
            </SettingsSection>

            <WorkingDirectoryInput value={defaultWorkingDir} onChange={onDefaultWorkingDirChange} />

            <SettingsSection
              title="Git Worktrees"
              description="Automatically create a git worktree for each new session so work stays isolated."
            >
              <div className="flex items-center" style={{ gap: 8, marginBottom: 16 }}>
                <Switch checked={worktreeEnabled} onCheckedChange={onWorktreeEnabledChange} />
                <Label
                  className="cursor-pointer"
                  onClick={() => onWorktreeEnabledChange(!worktreeEnabled)}
                >
                  Enable auto worktree creation
                </Label>
              </div>

              <p className="text-sm text-foreground-subtle" style={{ marginTop: 4 }}>
                Use <kbd className="font-mono text-foreground-muted">⌘T</kbd> to create a session
                with a worktree, or <kbd className="font-mono text-foreground-muted">⌘⇧T</kbd> to
                create one without.
              </p>

              {worktreeEnabled && (
                <div style={{ marginTop: 16 }}>
                  <p className="text-sm text-foreground-muted" style={{ marginBottom: 8 }}>
                    Branch prefix
                  </p>
                  <input
                    className="w-full rounded-lg border border-border bg-surface-elevated text-base text-foreground font-mono focus:border-primary focus:outline-none"
                    style={{ padding: "10px 12px", height: 40 }}
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
                  <p className="text-sm text-foreground-subtle" style={{ marginTop: 4 }}>
                    Branch will be named{" "}
                    <code className="font-mono text-foreground-muted">
                      {localBranchPrefix}brave-golden-falcon
                    </code>
                  </p>
                </div>
              )}
            </SettingsSection>

            <SettingsSection title="Updates">
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
                <span className="text-sm text-foreground-subtle">v{__APP_VERSION__}</span>
              </div>
            </SettingsSection>

            <SettingsSection title="Developer">
              <div className="flex items-center" style={{ gap: 8 }}>
                <span className="text-sm text-foreground-subtle">Session ID:</span>
                <code className="text-sm font-mono text-foreground-muted select-all">
                  {activeSessionId ?? "—"}
                </code>
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-foreground-subtle" style={{ marginTop: 4 }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

declare const __APP_VERSION__: string;
