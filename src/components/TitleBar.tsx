import { PanelBottomClose, PanelBottomOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TitleBarProps {
  onSettingsClick: () => void;
  onTogglePanel: () => void;
  isPanelVisible: boolean;
}

export function TitleBar({
  onSettingsClick,
  onTogglePanel,
  isPanelVisible,
}: TitleBarProps) {
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

      <Button
        variant="ghost"
        size="icon"
        className="rounded-md text-foreground-subtle"
        style={{ width: 28, height: 28, marginRight: 4 }}
        onClick={onTogglePanel}
        title={
          isPanelVisible
            ? "Hide Terminal Panel (⌘J)"
            : "Show Terminal Panel (⌘J)"
        }
      >
        {isPanelVisible ? (
          <PanelBottomClose className="h-4 w-4" />
        ) : (
          <PanelBottomOpen className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="rounded-md text-foreground-subtle"
        style={{ width: 28, height: 28 }}
        onClick={onSettingsClick}
        title="Settings (⌘,)"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}
