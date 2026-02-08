import { useState, useRef, useEffect } from "react";
import { Plus, X, RotateCw, GitBranch, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Session, SidebarPosition } from "@/lib/sessions";
import { sessionDisplayName } from "@/lib/sessions";
import type { PersistedTab } from "@/lib/persisted-tabs";

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  position: SidebarPosition;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onClose: (sessionId: string) => void;
  onRestart: (sessionId: string) => void;
  onRename: (sessionId: string, name: string) => void;
  onCollapse?: () => void;
  getPersistedTab: (tabId: string | undefined) => PersistedTab | undefined;
}

function getActivityDot(session: Session): { color: string; animation?: string } {
  if (session.status === "exited") {
    return { color: "#52525b" };
  }
  switch (session.activityState) {
    case "running":
      return { color: "#3b82f6", animation: "pulse-running 2s ease-in-out infinite" };
    case "finished":
      return { color: "#10b981" };
    case "needs_input":
      return { color: "#f59e0b", animation: "pulse-attention 1.5s ease-in-out infinite" };
    case "idling":
    default:
      return { color: "#52525b" };
  }
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
  onCollapse,
  getPersistedTab,
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
        getPersistedTab={getPersistedTab}
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
      onCollapse={onCollapse}
      getPersistedTab={getPersistedTab}
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
  onCollapse,
  getPersistedTab,
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
    setEditValue(session.name || sessionDisplayName(session, getPersistedTab(session.persistedTabId)));
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
      style={{ width: "100%", height: "100%" }}
    >
      <div
        className="flex items-center border-b border-border"
        style={{ padding: "10px 12px", gap: 8 }}
      >
        <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider flex-1">
          Sessions
        </span>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground-subtle hover:text-foreground hover:bg-surface-hover"
            style={{ width: 22, height: 22 }}
            onClick={onCollapse}
            title="Collapse sidebar (⌘B)"
          >
            <ChevronsLeft size={14} />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 6 }}>
        {sessions.map((session) => {
          const dot = getActivityDot(session);
          return (
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
                className="rounded-full flex-shrink-0"
                style={{
                  width: 9,
                  height: 9,
                  marginRight: 10,
                  backgroundColor: dot.color,
                  ...(dot.animation ? { animation: dot.animation } : {}),
                }}
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
                      {sessionDisplayName(session, getPersistedTab(session.persistedTabId))}
                    </div>
                    {session.gitBranch && (
                      <div
                        className="flex items-center text-xs truncate"
                        style={{
                          gap: 4,
                          marginTop: 3,
                          padding: "1px 6px",
                          borderRadius: 4,
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          color: "#60a5fa",
                          width: "fit-content",
                          maxWidth: "100%",
                        }}
                      >
                        <GitBranch style={{ width: 11, height: 11, flexShrink: 0 }} />
                        <span className="truncate">{session.gitBranch}</span>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground-subtle hover:text-foreground hover:bg-surface-hover"
                    style={{ width: 22, height: 22 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestart(session.id);
                    }}
                    title="Restart"
                  >
                    <RotateCw className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground-subtle hover:text-foreground hover:bg-surface-hover"
                  style={{ width: 22, height: 22 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(session.id);
                  }}
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border" style={{ padding: 8 }}>
        <Button
          variant="ghost"
          className="w-full justify-start text-foreground-muted hover:text-foreground"
          style={{ padding: "8px 10px", gap: 8, height: "auto" }}
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
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
  getPersistedTab,
}: Pick<SidebarProps, "sessions" | "activeSessionId" | "onSelect" | "onNew" | "onClose" | "getPersistedTab">) {
  return (
    <div
      className="flex items-center border-b border-border bg-surface/50 overflow-x-auto"
      style={{ height: 40, minHeight: 40, paddingLeft: 8, paddingRight: 8, gap: 2 }}
    >
      {sessions.map((session) => {
        const dot = getActivityDot(session);
        return (
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
              className="rounded-full flex-shrink-0"
              style={{
                width: 8,
                height: 8,
                backgroundColor: dot.color,
                ...(dot.animation ? { animation: dot.animation } : {}),
              }}
            />
            <span className="text-xs truncate" style={{ maxWidth: 120 }}>
              {sessionDisplayName(session, getPersistedTab(session.persistedTabId))}
            </span>
            {session.gitBranch && (
              <span
                className="flex items-center text-xs"
                style={{
                  gap: 3,
                  padding: "0 5px",
                  borderRadius: 4,
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  color: "#60a5fa",
                }}
              >
                <GitBranch style={{ width: 10, height: 10, flexShrink: 0 }} />
                <span className="truncate" style={{ maxWidth: 80 }}>{session.gitBranch}</span>
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 text-foreground-subtle hover:text-foreground"
              style={{ width: 16, height: 16 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose(session.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      <Button
        variant="ghost"
        size="icon"
        className="rounded-md text-foreground-subtle hover:text-foreground flex-shrink-0"
        style={{ width: 28, height: 28 }}
        onClick={onNew}
        title="New Session"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CollapsedSidebar({
  sessions,
  activeSessionId,
  position,
  onSelect,
  onNew,
  onExpand,
  getPersistedTab,
}: {
  sessions: Session[];
  activeSessionId: string | null;
  position: "left" | "right";
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onExpand: () => void;
  getPersistedTab: (tabId: string | undefined) => PersistedTab | undefined;
}) {
  return (
    <div
      className={cn(
        "flex flex-col bg-surface/50",
        position === "left" ? "border-r border-border" : "border-l border-border"
      )}
      style={{ width: 44, height: "100%", flexShrink: 0 }}
    >
      <div
        className="flex items-center justify-center border-b border-border"
        style={{ height: 41 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground-subtle hover:text-foreground hover:bg-surface-hover"
          style={{ width: 28, height: 28 }}
          onClick={onExpand}
          title="Expand sidebar (⌘B)"
        >
          {position === "left" ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center" style={{ padding: 6, gap: 2 }}>
        {sessions.map((session) => {
          const dot = getActivityDot(session);
          return (
            <Button
              key={session.id}
              variant="ghost"
              size="icon"
              className={cn(
                "cursor-pointer",
                session.id === activeSessionId
                  ? "bg-surface-elevated"
                  : "hover:bg-surface-elevated/50"
              )}
              style={{ width: 32, height: 32, flexShrink: 0 }}
              onClick={() => onSelect(session.id)}
              title={sessionDisplayName(session, getPersistedTab(session.persistedTabId))}
            >
              <div
                className="rounded-full"
                style={{
                  width: 9,
                  height: 9,
                  backgroundColor: dot.color,
                  ...(dot.animation ? { animation: dot.animation } : {}),
                }}
              />
            </Button>
          );
        })}
      </div>

      <div className="border-t border-border flex justify-center" style={{ padding: 6 }}>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground-muted hover:text-foreground"
          style={{ width: 32, height: 32 }}
          onClick={onNew}
          title="New Session (⌘T)"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
