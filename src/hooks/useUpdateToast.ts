import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { UpdateToast } from "../components/UpdateToast";
import type { UseUpdaterResult } from "./useUpdater";
import { createElement } from "react";

const TOAST_ID = "app-update";

export function useUpdateToast(updater: UseUpdaterResult) {
	const { status, progress, updateInfo, error, downloadAndInstall, dismissUpdate } = updater;
	const prevStatus = useRef(status);

	useEffect(() => {
		const isVisible =
			status === "available" ||
			status === "downloading" ||
			status === "ready" ||
			status === "error";

		if (!isVisible) {
			if (prevStatus.current !== status) {
				toast.dismiss(TOAST_ID);
			}
			prevStatus.current = status;
			return;
		}

		toast.custom(
			() =>
				createElement(UpdateToast, {
					status,
					progress,
					version: updateInfo?.version,
					error,
					onAction: downloadAndInstall,
					onDismiss: dismissUpdate,
				}),
			{
				id: TOAST_ID,
				duration: Infinity,
				dismissible: status !== "downloading",
				onDismiss: dismissUpdate,
			},
		);

		prevStatus.current = status;
	}, [status, progress, updateInfo, error, downloadAndInstall, dismissUpdate]);
}
