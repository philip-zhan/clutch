import { useState, useRef, useEffect } from "react";
import { Plus, X, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session, SidebarPosition } from "@/lib/sessions";
import { sessionDisplayName } from "@/lib/sessions";

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  position: SidebarPosition;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onClose: (sessionId: string) => void;
  onRestart: (sessionId: string) => void;
  onRename: (sessionId: string, name: string) => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  position,
  onSelect,
  onNew,
  onClose,
  onRestart,
  onRename,
}: SidebarProps) {
  const isHorizontal = position === "top" || position === "bottom";

  if (isHorizontal) {
    return (
      <HorizontalSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={onSelect}
        onNew={onNew}
        onClose={onClose}
      />
    );
  }

  return (
    <VerticalSidebar
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSelect={onSelect}
      onNew={onNew}
      onClose={onClose}
      onRestart={onRestart}
      onRename={onRename}
    />
  );
}

function VerticalSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onClose,
  onRestart,
  onRename,
}: Omit<SidebarProps, "position">) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleDoubleClick = (session: Session) => {
    setEditingId(session.id);
    setEditValue(session.name || sessionDisplayName(session));
  };

  const commitRename = () => {
    if (editingId) {
      onRename(editingId, editValue.trim());
      setEditingId(null);
    }
  };

  return (
    <div
      className="flex flex-col border-r border-border bg-surface/50"
      style={{ width: 220, minWidth: 220 }}
    >
      <div
        className="flex items-center border-b border-border"
        style={{ padding: "10px 12px", gap: 8 }}
      >
        <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider flex-1">
          Sessions
        </span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 6 }}>
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group flex items-center rounded-lg cursor-pointer transition-colors",
              session.id === activeSessionId
                ? "bg-surface-elevated text-foreground"
                : "text-foreground-muted hover:bg-surface-elevated/50"
            )}
            style={{ padding: "8px 10px", marginBottom: 2 }}
            onClick={() => onSelect(session.id)}
            onDoubleClick={() => handleDoubleClick(session)}
          >
            <div
              className={cn(
                "rounded-full flex-shrink-0",
                session.status === "running" ? "bg-success" : "bg-foreground-subtle"
              )}
              style={{ width: 7, height: 7, marginRight: 10 }}
            />

            <div className="flex-1 min-w-0">
              {editingId === session.id ? (
                <input
                  ref={inputRef}
                  className="w-full bg-transparent text-sm text-foreground outline-none border-b border-primary"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <div className="text-sm truncate">
                    {sessionDisplayName(session)}
                  </div>
                  {session.workingDir && session.name && (
                    <div className="text-xs text-foreground-subtle truncate">
                      {session.workingDir.split("/").pop()}
                    </div>
                  )}
                </>
              )}
            </div>

            <div
              className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ gap: 2, marginLeft: 4 }}
            >
              {session.status === "exited" && (
                <button
                  className="flex items-center justify-center rounded text-foreground-subtle hover:text-foreground hover:bg-surface-hover"
                  style={{ width: 22, height: 22 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestart(session.id);
                  }}
                  title="Restart"
                >
                  <RotateCw className="h-3 w-3" />
                </button>
              )}
              <button
                className="flex items-center justify-center rounded text-foreground-subtle hover:text-foreground hover:bg-surface-hover"
                style={{ width: 22, height: 22 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(session.id);
                }}
                title="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border" style={{ padding: 8 }}>
        <button
          className="flex items-center w-full rounded-lg text-sm text-foreground-muted hover:bg-surface-elevated hover:text-foreground transition-colors"
          style={{ padding: "8px 10px", gap: 8 }}
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>
    </div>
  );
}

function HorizontalSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onClose,
}: Pick<SidebarProps, "sessions" | "activeSessionId" | "onSelect" | "onNew" | "onClose">) {
  return (
    <div
      className="flex items-center border-b border-border bg-surface/50 overflow-x-auto"
      style={{ height: 40, minHeight: 40, paddingLeft: 8, paddingRight: 8, gap: 2 }}
    >
      {sessions.map((session) => (
        <div
          key={session.id}
          className={cn(
            "group flex items-center rounded-md cursor-pointer transition-colors flex-shrink-0",
            session.id === activeSessionId
              ? "bg-surface-elevated text-foreground"
              : "text-foreground-muted hover:bg-surface-elevated/50"
          )}
          style={{ padding: "4px 10px", gap: 6, height: 30 }}
          onClick={() => onSelect(session.id)}
        >
          <div
            className={cn(
              "rounded-full flex-shrink-0",
              session.status === "running" ? "bg-success" : "bg-foreground-subtle"
            )}
            style={{ width: 6, height: 6 }}
          />
          <span className="text-xs truncate" style={{ maxWidth: 120 }}>
            {sessionDisplayName(session)}
          </span>
          <button
            className="flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-foreground-subtle hover:text-foreground transition-opacity"
            style={{ width: 16, height: 16 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose(session.id);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      <button
        className="flex items-center justify-center rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-elevated transition-colors flex-shrink-0"
        style={{ width: 28, height: 28 }}
        onClick={onNew}
        title="New Session"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
