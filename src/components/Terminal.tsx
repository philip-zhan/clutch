import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { usePty } from "../hooks/usePty";
import "@xterm/xterm/css/xterm.css";

export interface TerminalProps {
  sessionId: string;
  workingDir: string;
  command?: string;
  isActive: boolean;
  onStatusChange?: (status: "running" | "exited") => void;
  onEnterPress?: () => void;
}

export function Terminal({
  sessionId,
  workingDir,
  command,
  isActive,
  onStatusChange,
  onEnterPress,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const hasReceivedData = useRef(false);

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

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: "'SF Mono', 'JetBrains Mono', Menlo, Monaco, monospace",
      fontSize: 13,
      lineHeight: 1.35,
      letterSpacing: 0,
      theme: {
        background: "#000000",
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
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const { cols, rows } = terminal;

    terminal.writeln("\x1b[90mStarting session...\x1b[0m\r\n");

    spawn(cols, rows, workingDir || undefined, command || undefined).then(() => {
      onStatusChange?.("running");
    }).catch((err) => {
      terminal.writeln(`\x1b[31mFailed to spawn PTY: ${err}\x1b[0m`);
    });

    terminal.onData((data) => {
      write(data);
      if (data.includes("\r") || data.includes("\n")) {
        onEnterPress?.();
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      const { cols, rows } = terminal;
      resize(cols, rows);
    };
    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    terminal.onResize(({ cols, rows }) => {
      resize(cols, rows);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="terminal-wrapper h-full w-full flex-1 bg-black"
    />
  );
}
