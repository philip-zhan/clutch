import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { STORE_FILE } from "@/lib/config";
import type { PersistedTab } from "@/lib/persisted-tabs";
import type {
  ClaudeActivityState,
  Session,
  SidebarPosition,
  WorktreeLocation,
} from "@/lib/sessions";
import type { NotificationSound } from "@/lib/sounds";

interface SessionStoreState {
  sessions: Session[];
  persistedTabs: PersistedTab[];
  activeSessionId: string | null;
  sidebarPosition: SidebarPosition;
  defaultCommand: string;
  defaultWorkingDir: string;
  worktreeEnabled: boolean;
  worktreeLocation: WorktreeLocation;
  worktreeCustomPath: string;
  branchPrefix: string;
  notificationSound: NotificationSound;
  onboardingCompleted: boolean;
}

const DEFAULT_STATE: SessionStoreState = {
  sessions: [],
  persistedTabs: [],
  activeSessionId: null,
  sidebarPosition: "left",
  defaultCommand: "claude",
  defaultWorkingDir: "",
  worktreeEnabled: true,
  worktreeLocation: "home",
  worktreeCustomPath: "",
  branchPrefix: "",
  notificationSound: "chime",
  onboardingCompleted: false,
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

      // Tabs persist across restarts
      const rawTabs = (await store.get<PersistedTab[]>("persistedTabs")) ?? [];

      // Validate which worktree paths still exist on disk
      const worktreePaths = rawTabs.map((t) => t.worktreePath ?? "");
      const validFlags = worktreePaths.some((p) => p)
        ? await invoke<boolean[]>("validate_worktrees", { worktreePaths })
        : worktreePaths.map(() => true);
      const persistedTabs = rawTabs.filter((_, i) => !worktreePaths[i] || validFlags[i]);

      // Restore a session for each persisted tab
      // Session.id = PersistedTab.id — stable across restarts so
      // CLUTCH_SESSION_ID and status directories survive hot-reload / restart.
      const sessions: Session[] = persistedTabs.map((tab) => ({
        id: tab.id,
        name: "",
        workingDir: tab.workingDir,
        command: tab.command,
        status: "running" as const,
        createdAt: Date.now(),
        worktreePath: tab.worktreePath,
        gitRepoPath: tab.gitRepoPath,
        originalWorkingDir: tab.originalWorkingDir,
        activityState: "idling" as const,
      }));
      const activeSessionId = sessions.length > 0 ? sessions[0].id : null;

      const sidebarPosition = (await store.get<SidebarPosition>("sidebarPosition")) ?? "left";
      const defaultCommand = (await store.get<string>("defaultCommand")) ?? "claude";
      const defaultWorkingDir = (await store.get<string>("defaultWorkingDir")) ?? "";
      const worktreeEnabled = (await store.get<boolean>("worktreeEnabled")) ?? true;
      const worktreeLocation = (await store.get<WorktreeLocation>("worktreeLocation")) ?? "home";
      const worktreeCustomPath = (await store.get<string>("worktreeCustomPath")) ?? "";
      const branchPrefix = (await store.get<string>("branchPrefix")) ?? "";
      const notificationSound =
        (await store.get<NotificationSound>("notificationSound")) ?? "chime";
      const onboardingCompleted = (await store.get<boolean>("onboardingCompleted")) ?? false;

      if (mounted) {
        setState({
          sessions,
          persistedTabs,
          activeSessionId,
          sidebarPosition,
          defaultCommand,
          defaultWorkingDir,
          worktreeEnabled,
          worktreeLocation,
          worktreeCustomPath,
          branchPrefix,
          notificationSound,
          onboardingCompleted,
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
      await store.set("persistedTabs", state.persistedTabs);
      await store.set("sidebarPosition", state.sidebarPosition);
      await store.set("defaultCommand", state.defaultCommand);
      await store.set("defaultWorkingDir", state.defaultWorkingDir);
      await store.set("worktreeEnabled", state.worktreeEnabled);
      await store.set("worktreeLocation", state.worktreeLocation);
      await store.set("worktreeCustomPath", state.worktreeCustomPath);
      await store.set("branchPrefix", state.branchPrefix);
      await store.set("notificationSound", state.notificationSound);
      await store.set("onboardingCompleted", state.onboardingCompleted);
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

  const updateSession = useCallback((sessionId: string, updates: Partial<Session>) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === sessionId ? { ...s, ...updates } : s)),
    }));
  }, []);

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

  const setWorktreeEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, worktreeEnabled: enabled }));
  }, []);

  const setWorktreeLocation = useCallback((location: WorktreeLocation) => {
    setState((prev) => ({ ...prev, worktreeLocation: location }));
  }, []);

  const setWorktreeCustomPath = useCallback((path: string) => {
    setState((prev) => ({ ...prev, worktreeCustomPath: path }));
  }, []);

  const setBranchPrefix = useCallback((prefix: string) => {
    setState((prev) => ({ ...prev, branchPrefix: prefix }));
  }, []);

  const setNotificationSound = useCallback((sound: NotificationSound) => {
    setState((prev) => ({ ...prev, notificationSound: sound }));
  }, []);

  const setOnboardingCompleted = useCallback((completed: boolean) => {
    setState((prev) => ({ ...prev, onboardingCompleted: completed }));
  }, []);

  const setActivityState = useCallback((sessionId: string, activityState: ClaudeActivityState) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === sessionId ? { ...s, activityState } : s)),
    }));
  }, []);

  const addPersistedTab = useCallback((tab: PersistedTab) => {
    setState((prev) => ({
      ...prev,
      persistedTabs: [...prev.persistedTabs, tab],
    }));
  }, []);

  const removePersistedTab = useCallback((tabId: string) => {
    setState((prev) => ({
      ...prev,
      persistedTabs: prev.persistedTabs.filter((t) => t.id !== tabId),
    }));
  }, []);

  const getPersistedTab = useCallback(
    (tabId: string | undefined): PersistedTab | undefined => {
      if (!tabId) return undefined;
      return state.persistedTabs.find((t) => t.id === tabId);
    },
    [state.persistedTabs],
  );

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
    setWorktreeEnabled,
    setWorktreeLocation,
    setWorktreeCustomPath,
    setBranchPrefix,
    setNotificationSound,
    setOnboardingCompleted,
    setActivityState,
    addPersistedTab,
    removePersistedTab,
    getPersistedTab,
  };
}
