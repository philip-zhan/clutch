import { useCallback, useState } from "react";
import { useSessionStore } from "./hooks/useSessionStore";
import { useUpdater } from "./hooks/useUpdater";
import { useSessionHandlers } from "./hooks/useSessionHandlers";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { usePolling } from "./hooks/usePolling";
import { TitleBar } from "./components/TitleBar";
import { Sidebar, CollapsedSidebar } from "./components/Sidebar";
import { SessionContent } from "./components/SessionContent";
import { AppLayout } from "./components/AppLayout";
import { Settings } from "./components/Settings";
import { UpdateDialog } from "./components/UpdateDialog";

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
        getPersistedTab,
    } = useSessionStore();

    const updater = useUpdater();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const {
        handleNewSession,
        handleCloseSession,
        handleRestartSession,
        handleRenameSession,
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
        addSession,
        removeSession,
        updateSession,
        setActiveSession,
    });

    usePolling({ sessions, notificationSound, setActivityState, updateSession });

    useKeyboardShortcuts({
        sessions,
        activeSessionId,
        onSelectSession: handleSelectSession,
        onNewSession: handleNewSession,
        onCloseSession: handleCloseSession,
        onTogglePanel: handleTogglePanel,
        onToggleSidebar: useCallback(() => setSidebarCollapsed((prev) => !prev), []),
        onToggleSettings: useCallback(() => setIsSettingsOpen((prev) => !prev), []),
        isSettingsOpen,
    });

    if (isSettingsOpen) {
        return (
            <main style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
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
            </main>
        );
    }

    return (
        <main style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
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
                        onRename={handleRenameSession}
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

            <UpdateDialog
                state={updater}
                onDownload={updater.downloadAndInstall}
                onDismiss={updater.dismissUpdate}
            />
        </main>
    );
}

export default App;
