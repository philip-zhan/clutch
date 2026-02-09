import { useState, useEffect, useCallback, useRef } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
	| "idle"
	| "checking"
	| "available"
	| "downloading"
	| "ready"
	| "error";

export interface UpdateState {
	status: UpdateStatus;
	progress: number;
	error: string | null;
	updateInfo: {
		version: string;
		currentVersion: string;
		body?: string;
		date?: string;
	} | null;
}

export interface UseUpdaterResult extends UpdateState {
	checkForUpdates: () => Promise<void>;
	downloadAndInstall: () => Promise<void>;
	dismissUpdate: () => void;
}

export function useUpdater(): UseUpdaterResult {
	const [state, setState] = useState<UpdateState>({
		status: "idle",
		progress: 0,
		error: null,
		updateInfo: null,
	});

	const updateRef = useRef<Update | null>(null);
	const statusRef = useRef(state.status);
	statusRef.current = state.status;

	const checkForUpdates = useCallback(async () => {
		if (statusRef.current === "checking" || statusRef.current === "downloading") {
			return;
		}

		setState((prev) => ({ ...prev, status: "checking", error: null }));

		try {
			const update = await check();

			if (update) {
				updateRef.current = update;
				setState({
					status: "available",
					progress: 0,
					error: null,
					updateInfo: {
						version: update.version,
						currentVersion: update.currentVersion,
						body: update.body ?? undefined,
						date: update.date ?? undefined,
					},
				});
			} else {
				setState((prev) => ({ ...prev, status: "idle" }));
			}
		} catch (err) {
			console.error("[Updater] Check failed:", err);
			setState((prev) => ({
				...prev,
				status: "error",
				error:
					err instanceof Error ? err.message : "Failed to check for updates",
			}));
		}
	}, []);

	const downloadAndInstall = useCallback(async () => {
		const update = updateRef.current;
		if (!update) return;

		setState((prev) => ({ ...prev, status: "downloading", progress: 0 }));

		try {
			let contentLength = 0;
			let downloaded = 0;

			await update.downloadAndInstall((event) => {
				switch (event.event) {
					case "Started":
						contentLength = event.data?.contentLength ?? 0;
						break;
					case "Progress": {
						downloaded += event.data?.chunkLength ?? 0;
						const progress =
							contentLength > 0
								? Math.round((downloaded / contentLength) * 100)
								: 0;
						setState((prev) => ({ ...prev, progress }));
						break;
					}
					case "Finished":
						setState((prev) => ({ ...prev, status: "ready", progress: 100 }));
						break;
				}
			});

			await relaunch();
		} catch (err) {
			console.error("[Updater] Download/install failed:", err);
			setState((prev) => ({
				...prev,
				status: "error",
				error: err instanceof Error ? err.message : "Failed to install update",
			}));
		}
	}, []);

	const dismissUpdate = useCallback(() => {
		setState({
			status: "idle",
			progress: 0,
			error: null,
			updateInfo: null,
		});
		updateRef.current = null;
	}, []);

	// Auto-check on startup + every 30 minutes
	useEffect(() => {
		const initialTimer = setTimeout(() => {
			checkForUpdates();
		}, 3000);

		const interval = setInterval(() => {
			checkForUpdates();
		}, 30 * 60 * 1000);

		return () => {
			clearTimeout(initialTimer);
			clearInterval(interval);
		};
	}, [checkForUpdates]);

	return {
		...state,
		checkForUpdates,
		downloadAndInstall,
		dismissUpdate,
	};
}
