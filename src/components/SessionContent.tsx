import { Plus } from "lucide-react";
import type { MutableRefObject } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import type { Session } from "../lib/sessions";
import { Terminal } from "./Terminal";
import { Button } from "./ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";

interface SessionContentProps {
  sessions: Session[];
  activeSessionId: string | null;
  mountedPanels: Set<string>;
  visiblePanels: Set<string>;
  setVisiblePanels: React.Dispatch<React.SetStateAction<Set<string>>>;
  panelRefs: MutableRefObject<Map<string, PanelImperativeHandle | null>>;
  onStatusChange: (sessionId: string, status: "running" | "exited") => void;
  onNewSession: () => void;
}

export function SessionContent({
  sessions,
  activeSessionId,
  mountedPanels,
  visiblePanels,
  setVisiblePanels,
  panelRefs,
  onStatusChange,
  onNewSession,
}: SessionContentProps) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const isPanelMounted = mountedPanels.has(session.id);

        return (
          <div
            key={session.id}
            style={{
              display: isActive ? "flex" : "none",
              flexDirection: "column",
              flex: 1,
              height: "100%",
              overflow: "hidden",
            }}
          >
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel minSize={200}>
                <Terminal
                  sessionId={session.id}
                  workingDir={session.workingDir}
                  command={session.command}
                  isActive={isActive}
                  onStatusChange={(status) =>
                    onStatusChange(session.id, status)
                  }
                />
              </ResizablePanel>

              {isPanelMounted && (
                <>
                  <ResizableHandle />
                  <ResizablePanel
                    panelRef={(handle) => {
                      if (handle) {
                        panelRefs.current.set(session.id, handle);
                      } else {
                        panelRefs.current.delete(session.id);
                      }
                    }}
                    collapsible
                    defaultSize={400}
                    minSize={100}
                    style={{ backgroundColor: "#0c0c0e" }}
                    onResize={(panelSize) => {
                      const isCollapsed = panelSize.asPercentage === 0;
                      setVisiblePanels((prev) => {
                        const wasVisible = prev.has(session.id);
                        if (isCollapsed && wasVisible) {
                          const next = new Set(prev);
                          next.delete(session.id);
                          return next;
                        }
                        if (!isCollapsed && !wasVisible) {
                          const next = new Set(prev);
                          next.add(session.id);
                          return next;
                        }
                        return prev;
                      });
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 0 0 8px",
                        height: "100%",
                        backgroundColor: "#0c0c0e",
                      }}
                    >
                      <Terminal
                        sessionId={`${session.id}_panel`}
                        workingDir={session.workingDir}
                        isActive={isActive && visiblePanels.has(session.id)}
                        backgroundColor="#0c0c0e"
                        showGradient={false}
                      />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        );
      })}

      {sessions.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: 16,
          }}
        >
          <div
            className="rounded-full bg-surface-elevated"
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus className="h-8 w-8 text-foreground-subtle" />
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="text-foreground-muted text-sm">No sessions yet</p>
            <p
              className="text-foreground-subtle text-xs"
              style={{ marginTop: 4 }}
            >
              Press <kbd className="font-mono text-foreground-muted">⌘T</kbd> or
              click below to start
            </p>
          </div>
          <Button style={{ padding: "8px 20px" }} onClick={onNewSession}>
            Create your first session
          </Button>
        </div>
      )}
    </div>
  );
}
