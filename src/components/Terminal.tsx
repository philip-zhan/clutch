import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import type { ISearchOptions } from "@xterm/addon-search";
import { usePty } from "../hooks/usePty";
import { TerminalSearchBar } from "./TerminalSearchBar";
import "@xterm/xterm/css/xterm.css";
import { TERMINAL_FONT_FAMILY, TERMINAL_FONT_SIZE, TERMINAL_LINE_HEIGHT } from "../lib/config";

export interface TerminalProps {
  sessionId: string;
  workingDir: string;
  command?: string;
  isActive: boolean;
  onStatusChange?: (status: "running" | "exited") => void;
  backgroundColor?: string;
  showGradient?: boolean;
}

export function Terminal({
  sessionId,
  workingDir,
  command,
  isActive,
  onStatusChange,
  backgroundColor = "#000000",
  showGradient = true,
}: TerminalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const hasReceivedData = useRef(false);
  const searchQueryRef = useRef("");
  const searchOptionsRef = useRef<ISearchOptions>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleData = useCallback((data: string) => {
    if (!hasReceivedData.current) {
      hasReceivedData.current = true;
      terminalRef.current?.reset();
    }
    terminalRef.current?.write(data);
  }, []);

  const { spawn, write, resize } = usePty({
    sessionId,
    onData: handleData,
    onExit: () => {
      hasReceivedData.current = false;
      terminalRef.current?.writeln("\r\n\x1b[90m[Process exited]\x1b[0m");
      onStatusChange?.("exited");
    },
  });

  // Fit terminal when becoming active
  useEffect(() => {
    if (isActive && fitAddonRef.current && terminalRef.current) {
      // Small delay to let display:none → display:flex take effect
      requestAnimationFrame(() => {
        try {
          fitAddonRef.current?.fit();
          const { cols, rows } = terminalRef.current!;
          resize(cols, rows);
        } catch {
          // Ignore fit errors if container not visible yet
        }
      });
    }
  }, [isActive, resize]);

  // Cmd+F / Cmd+G keyboard handler (capture phase to intercept before browser/xterm)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this terminal (or its search bar) contains focus
      if (!wrapperRef.current?.contains(document.activeElement)) return;

      if (e.metaKey && e.key === "f") {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchOpen(true);
        return;
      }

      if (e.metaKey && e.key === "g" && isSearchOpen && searchAddonRef.current) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          searchAddonRef.current.findPrevious(
            searchQueryRef.current,
            searchOptionsRef.current,
          );
        } else {
          searchAddonRef.current.findNext(
            searchQueryRef.current,
            searchOptionsRef.current,
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isActive, isSearchOpen]);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new XTerm({
      allowProposedApi: true,
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: TERMINAL_FONT_FAMILY,
      fontSize: TERMINAL_FONT_SIZE,
      lineHeight: TERMINAL_LINE_HEIGHT,
      letterSpacing: 0,
      overviewRuler: { width: 0 },
      theme: {
        background: backgroundColor,
        foreground: "#e4e4e7",
        cursor: "#3b82f6",
        cursorAccent: "#09090b",
        selectionBackground: "rgba(59, 130, 246, 0.3)",
        selectionForeground: undefined,
        black: "#18181b",
        red: "#f43f5e",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e4e4e7",
        brightBlack: "#52525b",
        brightRed: "#fb7185",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#fafafa",
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const unicode11Addon = new Unicode11Addon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(unicode11Addon);
    terminal.unicode.activeVersion = "11";

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    const { cols, rows } = terminal;

    terminal.writeln("\x1b[90mStarting session...\x1b[0m\r\n");

    spawn(cols, rows, workingDir || undefined, command || undefined).then(() => {
      onStatusChange?.("running");
      // Re-fit after spawn to catch container layout settling
      setTimeout(() => {
        try {
          fitAddon.fit();
          resize(terminal.cols, terminal.rows);
        } catch { /* container may not be visible */ }
      }, 100);
    }).catch((err) => {
      terminal.writeln(`\x1b[31mFailed to spawn PTY: ${err}\x1b[0m`);
    });

    terminal.onData((data) => {
      write(data);
    });

    // Debounced resize handler — only notify the PTY via terminal.onResize
    // to avoid duplicate resize calls
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        try {
          fitAddon.fit();
        } catch { /* ignore if container hidden */ }
      }, 50);
    };
    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    // Single source of truth for PTY resize — fires after fitWithScrollbarGap()
    terminal.onResize(({ cols, rows }) => {
      resize(cols, rows);
    });

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    terminalRef.current?.focus();
  }, []);

  const handleSearchChange = useCallback(
    (query: string, options: ISearchOptions) => {
      searchQueryRef.current = query;
      searchOptionsRef.current = options;
    },
    [],
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "flex", flex: 1, width: "100%", height: "100%", backgroundColor }}>
      <div
        ref={containerRef}
        className={`terminal-wrapper h-full w-full flex-1${showGradient ? "" : " no-gradient"}`}
        style={{ backgroundColor }}
      />
      {isSearchOpen && searchAddonRef.current && (
        <TerminalSearchBar
          searchAddon={searchAddonRef.current}
          onClose={handleSearchClose}
          onSearchChange={handleSearchChange}
        />
      )}
    </div>
  );
}
