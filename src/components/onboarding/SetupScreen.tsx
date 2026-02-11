import { Volume2 } from "lucide-react";
import { type NotificationSound, playNotificationSound, SOUND_OPTIONS } from "@/lib/sounds";
import { WorkingDirectoryInput } from "../shared/WorkingDirectoryInput";
import { Button } from "../ui/button";

interface SetupScreenProps {
  workingDir: string;
  onWorkingDirChange: (dir: string) => void;
  notificationSound: NotificationSound;
  onNotificationSoundChange: (sound: NotificationSound) => void;
}

export function SetupScreen({
  workingDir,
  onWorkingDirChange,
  notificationSound,
  onNotificationSoundChange,
}: SetupScreenProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground" style={{ marginBottom: 8 }}>
        Setup
      </h1>
      <p className="text-base text-foreground-muted" style={{ marginBottom: 28 }}>
        You can always change these later in Settings.
      </p>

      <WorkingDirectoryInput showHeader value={workingDir} onChange={onWorkingDirChange} />

      <div style={{ marginTop: 28 }}>
        <h3 className="text-base font-medium text-foreground" style={{ marginBottom: 4 }}>
          Notification Sound
        </h3>
        <p className="text-sm text-foreground-subtle" style={{ marginBottom: 12 }}>
          Plays when a session needs your input.
        </p>
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
      </div>
    </>
  );
}
