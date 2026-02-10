import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface PtyDataPayload {
  session_id: string;
  data: string;
}

interface PtyExitPayload {
  session_id: string;
}

interface UsePtyOptions {
  sessionId: string;
  onData: (data: string) => void;
  onExit: () => void;
}

export function usePty({ sessionId, onData, onExit }: UsePtyOptions) {
  const isSpawned = useRef(false);
  const unlistenData = useRef<UnlistenFn | null>(null);
  const unlistenExit = useRef<UnlistenFn | null>(null);
  const onDataRef = useRef(onData);
  const onExitRef = useRef(onExit);
  const lastSpawnArgs = useRef<{
    cols: number;
    rows: number;
    workingDir?: string;
    command?: string;
  } | null>(null);

  onDataRef.current = onData;
  onExitRef.current = onExit;

  useEffect(() => {
    let mounted = true;

    const setupListeners = async () => {
      unlistenData.current?.();
      unlistenExit.current?.();

      unlistenData.current = await listen<PtyDataPayload>("pty-data", (event) => {
        if (mounted && event.payload.session_id === sessionId) {
          onDataRef.current(event.payload.data);
        }
      });

      unlistenExit.current = await listen<PtyExitPayload>("pty-exit", (event) => {
        if (mounted && event.payload.session_id === sessionId) {
          onExitRef.current();
        }
      });
    };

    setupListeners();

    return () => {
      mounted = false;
      unlistenData.current?.();
      unlistenExit.current?.();
    };
  }, [sessionId]);

  const spawn = useCallback(
    async (cols: number, rows: number, workingDir?: string, command?: string, statusId?: string) => {
      if (isSpawned.current) return;
      isSpawned.current = true;
      lastSpawnArgs.current = { cols, rows, workingDir, command };

      await invoke("create_session", {
        sessionId,
        cols,
        rows,
        workingDir: workingDir ?? null,
        command: command ?? null,
        statusId: statusId ?? null,
      });
    },
    [sessionId]
  );

  const respawn = useCallback(
    async (workingDir?: string, command?: string, statusId?: string) => {
      if (!lastSpawnArgs.current) return;

      isSpawned.current = false;

      const { cols, rows } = lastSpawnArgs.current;
      const dir = workingDir ?? lastSpawnArgs.current.workingDir;
      const cmd = command ?? lastSpawnArgs.current.command;

      await invoke("restart_session", {
        sessionId,
        cols,
        rows,
        workingDir: dir ?? null,
        command: cmd ?? null,
        statusId: statusId ?? null,
      });

      isSpawned.current = true;
      lastSpawnArgs.current = { cols, rows, workingDir: dir, command: cmd };
    },
    [sessionId]
  );

  const write = useCallback(
    async (data: string) => {
      if (!isSpawned.current) return;
      await invoke("session_write", { sessionId, data });
    },
    [sessionId]
  );

  const resize = useCallback(
    async (cols: number, rows: number) => {
      if (!isSpawned.current) return;
      await invoke("session_resize", { sessionId, cols, rows });
    },
    [sessionId]
  );

  const destroy = useCallback(async (statusId?: string) => {
    isSpawned.current = false;
    await invoke("destroy_session", { sessionId, statusId: statusId ?? null });
  }, [sessionId]);

  return { spawn, respawn, write, resize, destroy };
}
