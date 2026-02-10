import { useEffect } from "react";
import type { Session } from "../lib/sessions";

interface UseKeyboardShortcutsOptions {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onNewSessionWithoutWorktree: () => void;
  onCloseSession: (sessionId: string) => void;
  onTogglePanel: () => void;
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
  isSettingsOpen: boolean;
}

export function useKeyboardShortcuts({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onNewSessionWithoutWorktree,
  onCloseSession,
  onTogglePanel,
  onToggleSidebar,
  onToggleSettings,
  isSettingsOpen,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes settings
      if (e.key === "Escape" && isSettingsOpen) {
        e.preventDefault();
        onToggleSettings();
        return;
      }

      const isMeta = e.metaKey;
      if (!isMeta) return;

      // Cmd+B — Toggle sidebar
      if (e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        onToggleSidebar();
        return;
      }

      // Cmd+Shift+T — New session without worktree
      if (e.key === "t" && e.shiftKey) {
        e.preventDefault();
        onNewSessionWithoutWorktree();
        return;
      }

      // Cmd+T — New session
      if (e.key === "t" && !e.shiftKey) {
        e.preventDefault();
        onNewSession();
        return;
      }

      // Cmd+W — Close active session
      if (e.key === "w" && !e.shiftKey) {
        e.preventDefault();
        if (activeSessionId) {
          onCloseSession(activeSessionId);
        }
        return;
      }

      // Cmd+J — Toggle terminal panel
      if (e.key === "j" && !e.shiftKey) {
        e.preventDefault();
        onTogglePanel();
        return;
      }

      // Cmd+, — Toggle settings
      if (e.key === ",") {
        e.preventDefault();
        onToggleSettings();
        return;
      }

      // Cmd+1-9 — Switch to session N
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (index < sessions.length) {
          onSelectSession(sessions[index].id);
        }
        return;
      }

      // Cmd+Shift+[ — Previous session
      if (e.key === "[" && e.shiftKey) {
        e.preventDefault();
        if (sessions.length > 1 && activeSessionId) {
          const currentIndex = sessions.findIndex(
            (s) => s.id === activeSessionId,
          );
          const prevIndex =
            (currentIndex - 1 + sessions.length) % sessions.length;
          onSelectSession(sessions[prevIndex].id);
        }
        return;
      }

      // Cmd+Shift+] — Next session
      if (e.key === "]" && e.shiftKey) {
        e.preventDefault();
        if (sessions.length > 1 && activeSessionId) {
          const currentIndex = sessions.findIndex(
            (s) => s.id === activeSessionId,
          );
          const nextIndex = (currentIndex + 1) % sessions.length;
          onSelectSession(sessions[nextIndex].id);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    sessions,
    activeSessionId,
    onSelectSession,
    onCloseSession,
    onNewSession,
    onNewSessionWithoutWorktree,
    onTogglePanel,
    onToggleSidebar,
    onToggleSettings,
    isSettingsOpen,
  ]);
}
