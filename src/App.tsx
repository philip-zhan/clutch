import { useEffect, useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionStore } from "./hooks/useSessionStore";
import { useUpdater } from "./hooks/useUpdater";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { usePolling } from "./hooks/usePolling";
import { generateSessionId } from "./lib/sessions";
import type { Session } from "./lib/sessions";
import { TitleBar } from "./components/TitleBar";
import { Sidebar, CollapsedSidebar } from "./components/Sidebar";
import { SessionContent } from "./components/SessionContent";
import { Settings } from "./components/Settings";
import { UpdateDialog } from "./components/UpdateDialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";
import type { PanelImperativeHandle } from "react-resizable-panels";

function App() {
    const {
        sessions,
        activeSessionId,
        sidebarPosition,
        defaultCommand,
        defaultWorkingDir,
        worktreeEnabled,
        branchPrefix,
        isLoaded,
        addSession,
        removeSession,
        updateSession,
        setActiveSession,
        setSidebarPosition,
        setDefaultCommand,
        setDefaultWorkingDir,
        setWorktreeEnabled,
        setBranchPrefix,
        notificationSound,
        setNotificationSound,
        setActivityState,
    } = useSessionStore();

    const updater = useUpdater();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Terminal panel state (per-session shell panel below main terminal)
    const [mountedPanels, setMountedPanels] = useState<Set<string>>(new Set());
    const [visiblePanels, setVisiblePanels] = useState<Set<string>>(new Set());

    // Track which terminal components are mounted to manage destroy
    const mountedSessionsRef = useRef<Set<string>>(new Set());

    // Refs for bottom panel imperative resize control
    const panelRefs = useRef<Map<string, PanelImperativeHandle | null>>(new Map());

    const handleCreateSession = useCallback(
        async (name: string, workingDir: string, command: string) => {
            const sessionId = generateSessionId();
            let effectiveDir = workingDir;
            let worktreePath: string | undefined;
            let gitRepoPath: string | undefined;
            let originalWorkingDir: string | undefined;

            if (worktreeEnabled && workingDir && sessions.length > 0) {
                try {
                    const result = await invoke<{
                        effective_dir: string;
                        worktree_path: string | null;
                        git_repo_path: string | null;
                    }>("setup_session_worktree", {
                        sessionId,
                        workingDir,
                        location: "home",
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
                activityState: "idling",
            };
            addSession(session);
        },
        [addSession, sessions.length, worktreeEnabled, branchPrefix]
    );

    const handleNewSession = useCallback(() => {
        handleCreateSession("", defaultWorkingDir, defaultCommand);
    }, [handleCreateSession, defaultWorkingDir, defaultCommand]);

    // Auto-create a session on startup
    const hasAutoCreatedRef = useRef(false);
    useEffect(() => {
        if (isLoaded && sessions.length === 0 && !hasAutoCreatedRef.current) {
            hasAutoCreatedRef.current = true;
            handleNewSession();
        }
    }, [isLoaded, sessions.length, handleNewSession]);

    const handleCloseSession = useCallback(
        async (sessionId: string) => {
            const session = sessions.find((s) => s.id === sessionId);

            // Destroy panel PTY if it was mounted
            if (mountedPanels.has(sessionId)) {
                try {
                    await invoke("destroy_session", { sessionId: `${sessionId}_panel` });
                } catch {
                    // Panel PTY may already be gone
                }
                setMountedPanels((prev) => {
                    const next = new Set(prev);
                    next.delete(sessionId);
                    return next;
                });
                setVisiblePanels((prev) => {
                    const next = new Set(prev);
                    next.delete(sessionId);
                    return next;
                });
            }

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
        [sessions, removeSession, mountedPanels]
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

    const handleSelectSession = useCallback(
        (sessionId: string) => {
            setActiveSession(sessionId);
        },
        [setActiveSession]
    );

    const handleTogglePanel = useCallback(() => {
        if (!activeSessionId) return;

        setVisiblePanels((prev) => {
            const next = new Set(prev);
            if (next.has(activeSessionId)) {
                next.delete(activeSessionId);
                panelRefs.current.get(activeSessionId)?.collapse();
            } else {
                next.add(activeSessionId);
                setMountedPanels((mp) => {
                    const nextMp = new Set(mp);
                    nextMp.add(activeSessionId);
                    return nextMp;
                });
                // If already mounted, expand; if newly mounted, defaultSize handles it
                panelRefs.current.get(activeSessionId)?.expand();
            }
            return next;
        });
    }, [activeSessionId]);

    // Extracted hooks
    usePolling({ sessions, notificationSound, setActivityState, updateSession });

    useKeyboardShortcuts({
        sessions,
        activeSessionId,
        onSelectSession: handleSelectSession,
        onNewSession: handleNewSession,
        onCloseSession: handleCloseSession,
        onTogglePanel: handleTogglePanel,
        onToggleSidebar: useCallback(() => setSidebarCollapsed((prev) => !prev), []),
        onOpenSettings: useCallback(() => setIsSettingsOpen(true), []),
    });

    const isVerticalSidebar = sidebarPosition === "left" || sidebarPosition === "right";

    // Determine flex direction based on sidebar position (used for top/bottom)
    const flexDirection = {
        left: "row" as const,
        right: "row-reverse" as const,
        top: "column" as const,
        bottom: "column-reverse" as const,
    }[sidebarPosition];

    return (
        <main style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
            <TitleBar
                onSettingsClick={() => setIsSettingsOpen(true)}
                onTogglePanel={handleTogglePanel}
                isPanelVisible={activeSessionId ? visiblePanels.has(activeSessionId) : false}
            />

            {(() => {
                const sidebarElement = (
                    <Sidebar
                        sessions={sessions}
                        activeSessionId={activeSessionId}
                        position={sidebarPosition}
                        onSelect={handleSelectSession}
                        onNew={handleNewSession}
                        onClose={handleCloseSession}
                        onRestart={handleRestartSession}
                        onRename={handleRenameSession}
                        onCollapse={() => setSidebarCollapsed(true)}
                    />
                );

                const contentElement = (
                    <SessionContent
                        sessions={sessions}
                        activeSessionId={activeSessionId}
                        mountedPanels={mountedPanels}
                        visiblePanels={visiblePanels}
                        setVisiblePanels={setVisiblePanels}
                        panelRefs={panelRefs}
                        onStatusChange={handleSessionStatusChange}
                        onNewSession={handleNewSession}
                    />
                );

                if (isVerticalSidebar) {
                    if (sidebarCollapsed) {
                        return (
                            <div style={{
                                display: "flex",
                                flexDirection: sidebarPosition === "right" ? "row-reverse" : "row",
                                flex: 1,
                                overflow: "hidden",
                            }}>
                                <CollapsedSidebar
                                    sessions={sessions}
                                    activeSessionId={activeSessionId}
                                    position={sidebarPosition as "left" | "right"}
                                    onSelect={handleSelectSession}
                                    onNew={handleNewSession}
                                    onExpand={() => setSidebarCollapsed(false)}
                                />
                                {contentElement}
                            </div>
                        );
                    }

                    return (
                        <ResizablePanelGroup orientation="horizontal" style={{ flex: 1, overflow: "hidden" }}>
                            {sidebarPosition === "left" && (
                                <ResizablePanel defaultSize="220px" minSize="150px" maxSize="50%">
                                    {sidebarElement}
                                </ResizablePanel>
                            )}
                            {sidebarPosition === "left" && <ResizableHandle />}
                            <ResizablePanel minSize="200px">
                                {contentElement}
                            </ResizablePanel>
                            {sidebarPosition === "right" && <ResizableHandle />}
                            {sidebarPosition === "right" && (
                                <ResizablePanel defaultSize="220px" minSize="150px" maxSize="50%">
                                    {sidebarElement}
                                </ResizablePanel>
                            )}
                        </ResizablePanelGroup>
                    );
                }

                return (
                    <div style={{ display: "flex", flexDirection, flex: 1, overflow: "hidden" }}>
                        {sidebarElement}
                        {contentElement}
                    </div>
                );
            })()}

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
                branchPrefix={branchPrefix}
                onBranchPrefixChange={setBranchPrefix}
                notificationSound={notificationSound}
                onNotificationSoundChange={setNotificationSound}
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
