import { useCallback, useState } from "react";
import { AppLayout } from "./components/AppLayout";
import { Onboarding } from "./components/Onboarding";
import { SessionContent } from "./components/SessionContent";
import { Settings } from "./components/Settings";
import { CollapsedSidebar, Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { Toaster } from "./components/ui/sonner";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { usePolling } from "./hooks/usePolling";
import { useSessionHandlers } from "./hooks/useSessionHandlers";
import { useSessionStore } from "./hooks/useSessionStore";
import { useUpdater } from "./hooks/useUpdater";
import { useUpdateToast } from "./hooks/useUpdateToast";
import { DEBUG_FORCE_ONBOARDING } from "./lib/config";

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
    addPersistedTab,
    removePersistedTab,
    getPersistedTab,
    onboardingCompleted,
    setOnboardingCompleted,
  } = useSessionStore();

  const updater = useUpdater();
  useUpdateToast(updater);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    handleNewSession,
    handleNewSessionWithoutWorktree,
    handleCloseSession,
    handleRestartSession,
    handleSessionStatusChange,
    handleSelectSession,
    handleTogglePanel,
    mountedPanels,
    visiblePanels,
    setVisiblePanels,
    panelRefs,
  } = useSessionHandlers({
    sessions,
    activeSessionId,
    defaultCommand,
    defaultWorkingDir,
    worktreeEnabled,
    branchPrefix,
    isLoaded,
    onboardingCompleted,
    addSession,
    removeSession,
    updateSession,
    setActiveSession,
    addPersistedTab,
    removePersistedTab,
  });

  usePolling({ sessions, notificationSound, setActivityState, updateSession });

  useKeyboardShortcuts({
    sessions,
    activeSessionId,
    onSelectSession: handleSelectSession,
    onNewSession: handleNewSession,
    onNewSessionWithoutWorktree: handleNewSessionWithoutWorktree,
    onCloseSession: handleCloseSession,
    onTogglePanel: handleTogglePanel,
    onToggleSidebar: useCallback(() => setSidebarCollapsed((prev) => !prev), []),
    onToggleSettings: useCallback(() => setIsSettingsOpen((prev) => !prev), []),
    isSettingsOpen,
  });

  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const showOnboarding =
    !onboardingDismissed && (DEBUG_FORCE_ONBOARDING || !onboardingCompleted) && isLoaded;

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {showOnboarding && (
        <Onboarding
          onComplete={() => {
            setOnboardingCompleted(true);
            setOnboardingDismissed(true);
          }}
          defaultWorkingDir={defaultWorkingDir}
          onDefaultWorkingDirChange={setDefaultWorkingDir}
        />
      )}

      {isSettingsOpen && !showOnboarding && (
        <Settings
          onBack={() => setIsSettingsOpen(false)}
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
          activeSessionId={activeSessionId}
        />
      )}

      <div
        style={{
          display: isSettingsOpen || showOnboarding ? "none" : "contents",
        }}
      >
        <TitleBar
          onSettingsClick={() => setIsSettingsOpen(true)}
          onTogglePanel={handleTogglePanel}
          isPanelVisible={activeSessionId ? visiblePanels.has(activeSessionId) : false}
        />

        <AppLayout
          sidebarPosition={sidebarPosition}
          sidebarCollapsed={sidebarCollapsed}
          sidebar={
            <Sidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              position={sidebarPosition}
              onSelect={handleSelectSession}
              onNew={handleNewSession}
              onClose={handleCloseSession}
              onRestart={handleRestartSession}
              onCollapse={() => setSidebarCollapsed(true)}
              getPersistedTab={getPersistedTab}
            />
          }
          collapsedSidebar={
            <CollapsedSidebar
              getPersistedTab={getPersistedTab}
              sessions={sessions}
              activeSessionId={activeSessionId}
              position={sidebarPosition as "left" | "right"}
              onSelect={handleSelectSession}
              onNew={handleNewSession}
              onExpand={() => setSidebarCollapsed(false)}
            />
          }
        >
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
        </AppLayout>
      </div>

      <Toaster position="bottom-right" />
    </main>
  );
}

export default App;
