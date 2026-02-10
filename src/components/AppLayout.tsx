import type { ReactNode } from "react";
import type { SidebarPosition } from "../lib/sessions";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";

interface AppLayoutProps {
  sidebarPosition: SidebarPosition;
  sidebarCollapsed: boolean;
  sidebar: ReactNode;
  collapsedSidebar: ReactNode;
  children: ReactNode;
}

export function AppLayout({
  sidebarPosition,
  sidebarCollapsed,
  sidebar,
  collapsedSidebar,
  children,
}: AppLayoutProps) {
  const isVertical = sidebarPosition === "left" || sidebarPosition === "right";

  if (isVertical) {
    if (sidebarCollapsed) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: sidebarPosition === "right" ? "row-reverse" : "row",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {collapsedSidebar}
          {children}
        </div>
      );
    }

    return (
      <ResizablePanelGroup
        orientation="horizontal"
        style={{ flex: 1, overflow: "hidden" }}
      >
        {sidebarPosition === "left" && (
          <ResizablePanel defaultSize="220px" minSize="150px" maxSize="50%">
            {sidebar}
          </ResizablePanel>
        )}
        {sidebarPosition === "left" && <ResizableHandle />}
        <ResizablePanel minSize="200px">{children}</ResizablePanel>
        {sidebarPosition === "right" && <ResizableHandle />}
        {sidebarPosition === "right" && (
          <ResizablePanel defaultSize="220px" minSize="150px" maxSize="50%">
            {sidebar}
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    );
  }

  const flexDirection = {
    left: "row" as const,
    right: "row-reverse" as const,
    top: "column" as const,
    bottom: "column-reverse" as const,
  }[sidebarPosition];

  return (
    <div
      style={{ display: "flex", flexDirection, flex: 1, overflow: "hidden" }}
    >
      {sidebar}
      {children}
    </div>
  );
}
