import { useState, useEffect, useCallback, useRef } from "react";
import { Store } from "@tauri-apps/plugin-store";
import type { Session, SidebarPosition } from "@/lib/sessions";

const STORE_FILE = "sessions.json";

interface SessionStoreState {
  sessions: Session[];
  activeSessionId: string | null;
  sidebarPosition: SidebarPosition;
  defaultCommand: string;
  defaultWorkingDir: string;
}

const DEFAULT_STATE: SessionStoreState = {
  sessions: [],
  activeSessionId: null,
  sidebarPosition: "left",
  defaultCommand: "claude",
  defaultWorkingDir: "",
};

export function useSessionStore() {
  const [state, setState] = useState<SessionStoreState>(DEFAULT_STATE);
  const storeRef = useRef<Store | null>(null);
  const isLoadedRef = useRef(false);

  // Initialize store on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const store = await Store.load(STORE_FILE);
      storeRef.current = store;

      const sessions = ((await store.get<Session[]>("sessions")) ?? []).map((s) => ({
        ...s,
        status: "exited" as const,
      }));
      const activeSessionId = await store.get<string>("activeSessionId");
      const sidebarPosition =
        (await store.get<SidebarPosition>("sidebarPosition")) ?? "left";
      const defaultCommand =
        (await store.get<string>("defaultCommand")) ?? "claude";
      const defaultWorkingDir =
        (await store.get<string>("defaultWorkingDir")) ?? "";

      if (mounted) {
        setState({
          sessions,
          activeSessionId: sessions.length > 0 ? activeSessionId ?? null : null,
          sidebarPosition,
          defaultCommand,
          defaultWorkingDir,
        });
        isLoadedRef.current = true;
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Persist whenever state changes (after initial load)
  useEffect(() => {
    if (!isLoadedRef.current || !storeRef.current) return;

    const store = storeRef.current;
    const persist = async () => {
      await store.set("sessions", state.sessions);
      await store.set("activeSessionId", state.activeSessionId);
      await store.set("sidebarPosition", state.sidebarPosition);
      await store.set("defaultCommand", state.defaultCommand);
      await store.set("defaultWorkingDir", state.defaultWorkingDir);
      await store.save();
    };
    persist();
  }, [state]);

  const addSession = useCallback((session: Session) => {
    setState((prev) => ({
      ...prev,
      sessions: [...prev.sessions, session],
      activeSessionId: session.id,
    }));
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setState((prev) => {
      const sessions = prev.sessions.filter((s) => s.id !== sessionId);
      let activeSessionId = prev.activeSessionId;
      if (activeSessionId === sessionId) {
        activeSessionId = sessions.length > 0 ? sessions[sessions.length - 1].id : null;
      }
      return { ...prev, sessions, activeSessionId };
    });
  }, []);

  const updateSession = useCallback(
    (sessionId: string, updates: Partial<Session>) => {
      setState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? { ...s, ...updates } : s
        ),
      }));
    },
    []
  );

  const setActiveSession = useCallback((sessionId: string) => {
    setState((prev) => ({ ...prev, activeSessionId: sessionId }));
  }, []);

  const setSidebarPosition = useCallback((position: SidebarPosition) => {
    setState((prev) => ({ ...prev, sidebarPosition: position }));
  }, []);

  const setDefaultCommand = useCallback((command: string) => {
    setState((prev) => ({ ...prev, defaultCommand: command }));
  }, []);

  const setDefaultWorkingDir = useCallback((dir: string) => {
    setState((prev) => ({ ...prev, defaultWorkingDir: dir }));
  }, []);

  return {
    ...state,
    isLoaded: isLoadedRef.current,
    addSession,
    removeSession,
    updateSession,
    setActiveSession,
    setSidebarPosition,
    setDefaultCommand,
    setDefaultWorkingDir,
  };
}
