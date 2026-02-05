import { Settings } from "lucide-react";

interface TitleBarProps {
  onSettingsClick: () => void;
}

export function TitleBar({ onSettingsClick }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center border-b border-border bg-surface/80 backdrop-blur-md"
      style={{
        height: 36,
        minHeight: 36,
        paddingLeft: 78,
        paddingRight: 12,
      }}
    >
      <div data-tauri-drag-region className="flex-1" />

      <button
        className="flex items-center justify-center rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-elevated transition-colors"
        style={{ width: 28, height: 28 }}
        onClick={onSettingsClick}
        title="Settings (⌘,)"
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  );
}
