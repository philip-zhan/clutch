import { useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionStore } from "./hooks/useSessionStore";
import { useUpdater } from "./hooks/useUpdater";
import { generateSessionId } from "./lib/sessions";
import type { Session } from "./lib/sessions";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { Terminal } from "./components/Terminal";
import { Settings } from "./components/Settings";
import { UpdateDialog } from "./components/UpdateDialog";
import { Plus } from "lucide-react";
import { useState } from "react";

function App() {
  const {
    sessions,
    activeSessionId,
    sidebarPosition,
    defaultCommand,
    defaultWorkingDir,
    worktreeEnabled,
    worktreeLocation,
    worktreeCustomPath,
    branchPrefix,
    addSession,
    removeSession,
    updateSession,
    setActiveSession,
    setSidebarPosition,
    setDefaultCommand,
    setDefaultWorkingDir,
    setWorktreeEnabled,
    setWorktreeLocation,
    setWorktreeCustomPath,
    setBranchPrefix,
  } = useSessionStore();

  const updater = useUpdater();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Track which terminal components are mounted to manage destroy
  const mountedSessionsRef = useRef<Set<string>>(new Set());

  const handleCreateSession = useCallback(
    async (name: string, workingDir: string, command: string) => {
      const sessionId = generateSessionId();
      let effectiveDir = workingDir;
      let worktreePath: string | undefined;
      let gitRepoPath: string | undefined;
      let originalWorkingDir: string | undefined;

      if (worktreeEnabled && workingDir) {
        try {
          const location = worktreeLocation === "custom" ? worktreeCustomPath : worktreeLocation;
          const result = await invoke<{
            effective_dir: string;
            worktree_path: string | null;
            git_repo_path: string | null;
          }>("setup_session_worktree", {
            sessionId,
            workingDir,
            location,
            branchPrefix,
          });
          effectiveDir = result.effective_dir;
          worktreePath = result.worktree_path ?? undefined;
          gitRepoPath = result.git_repo_path ?? undefined;
          if (worktreePath) {
            originalWorkingDir = workingDir;
          }
        } catch {
          // Fallback to original dir
        }
      }

      const session: Session = {
        id: sessionId,
        name,
        workingDir: effectiveDir,
        command: command || undefined,
        status: "running",
        createdAt: Date.now(),
        worktreePath,
        gitRepoPath,
        originalWorkingDir,
      };
      addSession(session);
    },
    [addSession, worktreeEnabled, worktreeLocation, worktreeCustomPath, branchPrefix]
  );

  const handleNewSession = useCallback(() => {
    handleCreateSession("", defaultWorkingDir, defaultCommand);
  }, [handleCreateSession, defaultWorkingDir, defaultCommand]);

  const handleCloseSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);

      try {
        await invoke("destroy_session", { sessionId });
      } catch {
        // PTY may already be gone
      }

      // Clean up worktree if one was created
      if (session?.worktreePath && session?.gitRepoPath) {
        try {
          const result = await invoke<{ success: boolean; error: string | null }>(
            "cleanup_session_worktree",
            {
              worktreePath: session.worktreePath,
              gitRepoPath: session.gitRepoPath,
            }
          );
          if (!result.success && result.error) {
            const { message } = await import("@tauri-apps/plugin-dialog");
            await message(
              `Could not remove worktree:\n${result.error}\n\nThe worktree has been kept at:\n${session.worktreePath}`,
              { title: "Worktree Cleanup", kind: "warning" }
            );
          }
        } catch {
          // Best effort
        }
      }

      mountedSessionsRef.current.delete(sessionId);
      removeSession(sessionId);
    },
    [sessions, removeSession]
  );

  const handleRestartSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const restartDir = session.originalWorkingDir ?? session.workingDir;

      // Remove old session (cleans up worktree) and create a new one
      handleCloseSession(sessionId).then(() => {
        handleCreateSession(session.name, restartDir, session.command ?? "");
      });
    },
    [sessions, handleCloseSession, handleCreateSession]
  );

  const handleRenameSession = useCallback(
    (sessionId: string, name: string) => {
      updateSession(sessionId, { name });
    },
    [updateSession]
  );

  const handleSessionStatusChange = useCallback(
    (sessionId: string, status: "running" | "exited") => {
      updateSession(sessionId, { status });
    },
    [updateSession]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey;
      if (!isMeta) return;

      // Cmd+T — New session
      if (e.key === "t" && !e.shiftKey) {
        e.preventDefault();
        handleNewSession();
        return;
      }

      // Cmd+W — Close active session
      if (e.key === "w" && !e.shiftKey) {
        e.preventDefault();
        if (activeSessionId) {
          handleCloseSession(activeSessionId);
        }
        return;
      }

      // Cmd+, — Settings
      if (e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // Cmd+1-9 — Switch to session N
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < sessions.length) {
          setActiveSession(sessions[index].id);
        }
        return;
      }

      // Cmd+Shift+[ — Previous session
      if (e.key === "[" && e.shiftKey) {
        e.preventDefault();
        if (sessions.length > 1 && activeSessionId) {
          const currentIndex = sessions.findIndex((s) => s.id === activeSessionId);
          const prevIndex = (currentIndex - 1 + sessions.length) % sessions.length;
          setActiveSession(sessions[prevIndex].id);
        }
        return;
      }

      // Cmd+Shift+] — Next session
      if (e.key === "]" && e.shiftKey) {
        e.preventDefault();
        if (sessions.length > 1 && activeSessionId) {
          const currentIndex = sessions.findIndex((s) => s.id === activeSessionId);
          const nextIndex = (currentIndex + 1) % sessions.length;
          setActiveSession(sessions[nextIndex].id);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessions, activeSessionId, setActiveSession, handleCloseSession, handleNewSession]);

  // Determine flex direction based on sidebar position
  const flexDirection = {
    left: "row" as const,
    right: "row-reverse" as const,
    top: "column" as const,
    bottom: "column-reverse" as const,
  }[sidebarPosition];

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <TitleBar onSettingsClick={() => setIsSettingsOpen(true)} />

      <div style={{ display: "flex", flexDirection, flex: 1, overflow: "hidden" }}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          position={sidebarPosition}
          onSelect={setActiveSession}
          onNew={handleNewSession}
          onClose={handleCloseSession}
          onRestart={handleRestartSession}
          onRename={handleRenameSession}
        />

        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                display: session.id === activeSessionId ? "flex" : "none",
                flex: 1,
                overflow: "hidden",
              }}
            >
              <Terminal
                sessionId={session.id}
                workingDir={session.workingDir}
                command={session.command}
                isActive={session.id === activeSessionId}
                onStatusChange={(status) => handleSessionStatusChange(session.id, status)}
              />
            </div>
          ))}

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
                <p className="text-foreground-subtle text-xs" style={{ marginTop: 4 }}>
                  Press <kbd className="font-mono text-foreground-muted">⌘T</kbd> or click below to start
                </p>
              </div>
              <button
                className="rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors"
                style={{ padding: "8px 20px" }}
                onClick={handleNewSession}
              >
                Create your first session
              </button>
            </div>
          )}
        </div>
      </div>

      <Settings
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        sidebarPosition={sidebarPosition}
        onSidebarPositionChange={setSidebarPosition}
        defaultCommand={defaultCommand}
        onDefaultCommandChange={setDefaultCommand}
        defaultWorkingDir={defaultWorkingDir}
        onDefaultWorkingDirChange={setDefaultWorkingDir}
        worktreeEnabled={worktreeEnabled}
        onWorktreeEnabledChange={setWorktreeEnabled}
        worktreeLocation={worktreeLocation}
        onWorktreeLocationChange={setWorktreeLocation}
        worktreeCustomPath={worktreeCustomPath}
        onWorktreeCustomPathChange={setWorktreeCustomPath}
        branchPrefix={branchPrefix}
        onBranchPrefixChange={setBranchPrefix}
        updater={updater}
      />

      <UpdateDialog
        state={updater}
        onDownload={updater.downloadAndInstall}
        onDismiss={updater.dismissUpdate}
      />
    </main>
  );
}

export default App;
