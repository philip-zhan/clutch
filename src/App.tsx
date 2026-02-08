import { useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { nanoid } from "nanoid";
import { useSessionStore } from "./hooks/useSessionStore";
import { useUpdater } from "./hooks/useUpdater";
import { generateSessionId, generateBranchName } from "./lib/sessions";
import type { Session } from "./lib/sessions";
import type { Worktree } from "./lib/worktrees";
import { TitleBar } from "./components/TitleBar";
import { Sidebar, CollapsedSidebar } from "./components/Sidebar";
import { Terminal } from "./components/Terminal";
import { Settings } from "./components/Settings";
import { UpdateDialog } from "./components/UpdateDialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { playNotificationSound } from "./lib/sounds";
import { Plus } from "lucide-react";
import { useState } from "react";

function App() {
    const {
        sessions,
        worktrees,
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
        addWorktree,
        removeWorktree,
        getWorktree,
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

    // Ref for notification sound to avoid resetting poll interval on preference change
    const notificationSoundRef = useRef(notificationSound);
    notificationSoundRef.current = notificationSound;

    const handleCreateSession = useCallback(
        async (name: string, workingDir: string, command: string) => {
            const sessionId = generateSessionId();
            let effectiveDir = workingDir;
            let worktreeId: string | undefined;

            if (worktreeEnabled && workingDir && sessions.length > 0) {
                try {
                    const wtId = nanoid();
                    const branchName = `${branchPrefix}${generateBranchName()}`;
                    const result = await invoke<{
                        effective_dir: string;
                        worktree_path: string | null;
                        git_repo_path: string | null;
                    }>("setup_session_worktree", {
                        worktreeId: wtId,
                        branchName,
                        workingDir,
                        location: "home",
                    });
                    effectiveDir = result.effective_dir;
                    if (result.worktree_path && result.git_repo_path) {
                        const worktree: Worktree = {
                            id: wtId,
                            branchName,
                            worktreePath: result.worktree_path,
                            gitRepoPath: result.git_repo_path,
                            originalWorkingDir: workingDir,
                            command: command || undefined,
                            createdAt: Date.now(),
                        };
                        addWorktree(worktree);
                        worktreeId = wtId;
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
                worktreeId,
                activityState: "idling",
            };
            addSession(session);
        },
        [addSession, addWorktree, sessions.length, worktreeEnabled, branchPrefix]
    );

    const handleNewSession = useCallback(() => {
        handleCreateSession("", defaultWorkingDir, defaultCommand);
    }, [handleCreateSession, defaultWorkingDir, defaultCommand]);

    // Startup: restore sessions from persisted worktrees
    const hasRestoredRef = useRef(false);
    useEffect(() => {
        if (!isLoaded || hasRestoredRef.current) return;
        hasRestoredRef.current = true;

        const restore = async () => {
            if (worktrees.length === 0) {
                // No persisted worktrees — create a fresh main-branch session
                handleNewSession();
                return;
            }

            // Validate which worktree paths still exist on disk
            const paths = worktrees.map((wt) => wt.worktreePath);
            let valid: boolean[];
            try {
                valid = await invoke<boolean[]>("validate_worktrees", { worktreePaths: paths });
            } catch {
                // If validation fails, treat all as valid
                valid = paths.map(() => true);
            }

            const validWorktrees: Worktree[] = [];
            const invalidWorktreeIds: string[] = [];

            for (let i = 0; i < worktrees.length; i++) {
                if (valid[i]) {
                    validWorktrees.push(worktrees[i]);
                } else {
                    invalidWorktreeIds.push(worktrees[i].id);
                }
            }

            // Remove invalid worktrees from store
            for (const id of invalidWorktreeIds) {
                removeWorktree(id);
            }

            if (validWorktrees.length === 0) {
                // All worktrees were invalid — create a fresh session
                handleNewSession();
                return;
            }

            // Create sessions for each valid worktree
            for (const wt of validWorktrees) {
                const session: Session = {
                    id: generateSessionId(),
                    name: "",
                    workingDir: wt.worktreePath,
                    command: wt.command,
                    status: "running",
                    createdAt: Date.now(),
                    worktreeId: wt.id,
                    activityState: "idling",
                };
                addSession(session);
            }
        };

        restore();
    }, [isLoaded, worktrees, handleNewSession, addSession, removeWorktree]);

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

            // Clean up worktree if one was linked
            if (session?.worktreeId) {
                const worktree = getWorktree(session.worktreeId);
                if (worktree) {
                    try {
                        const result = await invoke<{ success: boolean; error: string | null }>(
                            "cleanup_session_worktree",
                            {
                                worktreeId: worktree.id,
                                worktreePath: worktree.worktreePath,
                                gitRepoPath: worktree.gitRepoPath,
                            }
                        );
                        if (result.success) {
                            removeWorktree(worktree.id);
                        } else if (result.error) {
                            const { message } = await import("@tauri-apps/plugin-dialog");
                            await message(
                                `Could not remove worktree:\n${result.error}\n\nThe worktree has been kept at:\n${worktree.worktreePath}`,
                                { title: "Worktree Cleanup", kind: "warning" }
                            );
                            // Worktree kept — will restore on next launch
                        }
                    } catch {
                        // Best effort — worktree kept for next launch
                    }
                }
            }

            mountedSessionsRef.current.delete(sessionId);
            removeSession(sessionId);
        },
        [sessions, removeSession, mountedPanels, getWorktree, removeWorktree]
    );

    const handleRestartSession = useCallback(
        (sessionId: string) => {
            const session = sessions.find((s) => s.id === sessionId);
            if (!session) return;

            const worktree = getWorktree(session.worktreeId);
            const restartDir = worktree?.originalWorkingDir ?? session.workingDir;

            // Remove old session (cleans up worktree) and create a new one
            handleCloseSession(sessionId).then(() => {
                handleCreateSession(session.name, restartDir, session.command ?? "");
            });
        },
        [sessions, handleCloseSession, handleCreateSession, getWorktree]
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

    // Poll session activity from Rust backend
    const lastSeenRef = useRef<Record<string, string>>({});
    useEffect(() => {
        const sessionIds = sessions.filter((s) => s.status === "running").map((s) => s.id);
        if (sessionIds.length === 0) return;

        const poll = async () => {
            try {
                const statuses = await invoke<Record<string, string>>("poll_session_activity", { sessionIds });
                const lastSeen = lastSeenRef.current;

                for (const [sessionId, content] of Object.entries(statuses)) {
                    if (content === lastSeen[sessionId]) continue;
                    lastSeen[sessionId] = content;

                    if (content === "UserPromptSubmit" || content === "PreToolUse") {
                        setActivityState(sessionId, "running");
                    } else if (content === "Stop") {
                        setActivityState(sessionId, "finished");
                    } else if (content === "Notification") {
                        setActivityState(sessionId, "needs_input");
                        playNotificationSound(notificationSoundRef.current);
                    }
                }
            } catch {
                // Ignore poll errors
            }
        };

        const interval = setInterval(poll, 250);
        return () => clearInterval(interval);
    }, [sessions, setActivityState]);

    // Poll git branches for running sessions
    useEffect(() => {
        const runningSessions = sessions.filter((s) => s.status === "running" && s.workingDir);
        if (runningSessions.length === 0) return;

        const poll = async () => {
            try {
                const sessionDirs: Record<string, string> = {};
                for (const s of runningSessions) {
                    sessionDirs[s.id] = s.workingDir;
                }
                const branches = await invoke<Record<string, string>>("get_git_branches", { sessions: sessionDirs });
                for (const [sessionId, branch] of Object.entries(branches)) {
                    const session = sessions.find((s) => s.id === sessionId);
                    if (session && session.gitBranch !== branch) {
                        updateSession(sessionId, { gitBranch: branch });
                    }
                }
            } catch {
                // Ignore poll errors
            }
        };

        poll(); // Initial fetch
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
    }, [sessions, updateSession]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMeta = e.metaKey;
            if (!isMeta) return;

            // Cmd+B — Toggle sidebar
            if (e.key === "b" && !e.shiftKey) {
                e.preventDefault();
                setSidebarCollapsed((prev) => !prev);
                return;
            }

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

            // Cmd+J — Toggle terminal panel
            if (e.key === "j" && !e.shiftKey) {
                e.preventDefault();
                handleTogglePanel();
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
                    handleSelectSession(sessions[index].id);
                }
                return;
            }

            // Cmd+Shift+[ — Previous session
            if (e.key === "[" && e.shiftKey) {
                e.preventDefault();
                if (sessions.length > 1 && activeSessionId) {
                    const currentIndex = sessions.findIndex((s) => s.id === activeSessionId);
                    const prevIndex = (currentIndex - 1 + sessions.length) % sessions.length;
                    handleSelectSession(sessions[prevIndex].id);
                }
                return;
            }

            // Cmd+Shift+] — Next session
            if (e.key === "]" && e.shiftKey) {
                e.preventDefault();
                if (sessions.length > 1 && activeSessionId) {
                    const currentIndex = sessions.findIndex((s) => s.id === activeSessionId);
                    const nextIndex = (currentIndex + 1) % sessions.length;
                    handleSelectSession(sessions[nextIndex].id);
                }
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sessions, activeSessionId, handleSelectSession, handleCloseSession, handleNewSession, handleTogglePanel]);

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
                        getWorktree={getWorktree}
                    />
                );

                const contentElement = (
                    <div style={{ display: "flex", flex: 1, height: "100%", width: "100%", overflow: "hidden", position: "relative" }}>
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
                                                onStatusChange={(status) => handleSessionStatusChange(session.id, status)}
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
                                                    defaultSize={300}
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
                                                    <div style={{ padding: "8px 0 0 8px", height: "100%", backgroundColor: "#0c0c0e" }}>
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
                                    getWorktree={getWorktree}
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
