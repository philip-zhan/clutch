import { useEffect, useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { nanoid } from "nanoid";
import { generateSessionId, generateBranchName } from "../lib/sessions";
import type { Session } from "../lib/sessions";
import type { PersistedTab } from "../lib/persisted-tabs";
import type { PanelImperativeHandle } from "react-resizable-panels";

interface UseSessionHandlersOptions {
    sessions: Session[];
    activeSessionId: string | null;
    defaultCommand: string;
    defaultWorkingDir: string;
    worktreeEnabled: boolean;
    branchPrefix: string;
    isLoaded: boolean;
    addSession: (session: Session) => void;
    removeSession: (sessionId: string) => void;
    updateSession: (sessionId: string, updates: Partial<Session>) => void;
    setActiveSession: (sessionId: string) => void;
    addPersistedTab: (tab: PersistedTab) => void;
    removePersistedTab: (tabId: string) => void;
}

export function useSessionHandlers({
    sessions,
    activeSessionId,
    defaultCommand,
    defaultWorkingDir,
    worktreeEnabled,
    branchPrefix,
    isLoaded,
    addSession,
    removeSession,
    updateSession,
    setActiveSession,
    addPersistedTab,
    removePersistedTab,
}: UseSessionHandlersOptions) {
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

            const hasExistingSessionForRepo = sessions.some(
                (s) =>
                    s.originalWorkingDir === workingDir ||
                    (!s.worktreePath && s.workingDir === workingDir)
            );

            if (worktreeEnabled && workingDir && hasExistingSessionForRepo) {
                try {
                    const branchName = branchPrefix + generateBranchName();
                    const result = await invoke<{
                        effective_dir: string;
                        worktree_path: string | null;
                        git_repo_path: string | null;
                    }>("setup_session_worktree", {
                        worktreeId: sessionId,
                        branchName,
                        workingDir,
                        location: "home",
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

            const persistedTabId = nanoid();
            const session: Session = {
                id: sessionId,
                name,
                workingDir: effectiveDir,
                command: command || undefined,
                status: "running",
                createdAt: Date.now(),
                persistedTabId,
                worktreePath,
                gitRepoPath,
                originalWorkingDir,
                activityState: "idling",
            };
            addSession(session);
            addPersistedTab({
                id: persistedTabId,
                workingDir: effectiveDir,
                command: command || undefined,
                createdAt: Date.now(),
                worktreePath,
                gitRepoPath,
                originalWorkingDir,
            });
        },
        [addSession, addPersistedTab, sessions, worktreeEnabled, branchPrefix]
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
                            worktreeId: sessionId,
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
            if (session?.persistedTabId) {
                removePersistedTab(session.persistedTabId);
            }
            removeSession(sessionId);
        },
        [sessions, removeSession, removePersistedTab, mountedPanels]
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

    return {
        handleNewSession,
        handleCloseSession,
        handleRestartSession,
        handleRenameSession,
        handleSessionStatusChange,
        handleSelectSession,
        handleTogglePanel,
        // Panel state needed by SessionContent
        mountedPanels,
        visiblePanels,
        setVisiblePanels,
        panelRefs,
    };
}
