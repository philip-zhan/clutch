import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Session, ClaudeActivityState } from "../lib/sessions";
import type { NotificationSound } from "../lib/sounds";
import { playNotificationSound } from "../lib/sounds";

interface UsePollingOptions {
    sessions: Session[];
    notificationSound: NotificationSound;
    setActivityState: (sessionId: string, state: ClaudeActivityState) => void;
    updateSession: (sessionId: string, updates: Partial<Session>) => void;
}

export function usePolling({
    sessions,
    notificationSound,
    setActivityState,
    updateSession,
}: UsePollingOptions) {
    const notificationSoundRef = useRef(notificationSound);
    notificationSoundRef.current = notificationSound;

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
}
