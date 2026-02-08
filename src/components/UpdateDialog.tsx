import {
	Download,
	RefreshCw,
	AlertTriangle,
	CheckCircle,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogBody,
	DialogFooter,
	DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import type { UpdateState } from "../hooks/useUpdater";

interface UpdateDialogProps {
	state: UpdateState;
	onDownload: () => void;
	onDismiss: () => void;
}

export function UpdateDialog({ state, onDownload, onDismiss }: UpdateDialogProps) {
	const isOpen =
		state.status === "available" ||
		state.status === "downloading" ||
		state.status === "ready" ||
		state.status === "error";

	if (!isOpen) return null;

	const canDismiss = state.status !== "downloading";

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && canDismiss && onDismiss()}>
			<DialogContent className="max-w-md">
				{canDismiss && <DialogClose onClick={onDismiss} />}

				<DialogHeader>
					<div
						className="flex items-center justify-center rounded-full mx-auto"
						style={{
							width: 48,
							height: 48,
							marginBottom: 16,
							background:
								state.status === "error"
									? "rgba(244, 63, 94, 0.1)"
									: "rgba(59, 130, 246, 0.1)",
						}}
					>
						{state.status === "error" ? (
							<AlertTriangle className="h-6 w-6 text-red-500" />
						) : state.status === "ready" ? (
							<CheckCircle className="h-6 w-6 text-green-500" />
						) : state.status === "downloading" ? (
							<RefreshCw className="h-6 w-6 text-primary animate-spin" />
						) : (
							<Download className="h-6 w-6 text-primary" />
						)}
					</div>

					<DialogTitle className="text-center">
						{state.status === "error"
							? "Update Failed"
							: state.status === "ready"
								? "Update Ready"
								: state.status === "downloading"
									? "Downloading Update"
									: "Update Available"}
					</DialogTitle>

					<DialogDescription className="text-center">
						{state.status === "error"
							? state.error || "An error occurred while updating."
							: state.status === "ready"
								? "The update has been downloaded. Restart to apply."
								: state.status === "downloading"
									? `Downloading version ${state.updateInfo?.version}...`
									: `Version ${state.updateInfo?.version} is available. You are currently on ${state.updateInfo?.currentVersion}.`}
					</DialogDescription>
				</DialogHeader>

				<DialogBody>
					{state.status === "downloading" && (
						<div style={{ marginBottom: 16 }}>
							<div
								className="w-full rounded-full bg-surface-elevated overflow-hidden"
								style={{ height: 8 }}
							>
								<div
									className="h-full bg-primary transition-all duration-300"
									style={{ width: `${state.progress}%` }}
								/>
							</div>
							<p
								className="text-xs text-foreground-subtle text-center"
								style={{ marginTop: 8 }}
							>
								{state.progress}% complete
							</p>
						</div>
					)}

					{state.updateInfo?.body && state.status === "available" && (
						<div
							className="rounded-lg bg-surface-elevated border border-border-subtle"
							style={{
								padding: 12,
								maxHeight: 120,
								overflowY: "auto",
							}}
						>
							<p
								className="text-xs text-foreground-subtle font-medium uppercase tracking-wide"
								style={{ marginBottom: 6 }}
							>
								What's New
							</p>
							<p className="text-sm text-foreground-muted whitespace-pre-wrap">
								{state.updateInfo.body}
							</p>
						</div>
					)}
				</DialogBody>

				<DialogFooter>
					{state.status === "available" && (
						<>
							<Button variant="secondary" onClick={onDismiss}>
								Later
							</Button>
							<Button onClick={onDownload}>
								<Download className="h-4 w-4" />
								Update Now
							</Button>
						</>
					)}
					{state.status === "downloading" && (
						<Button variant="secondary" disabled>
							<RefreshCw className="h-4 w-4 animate-spin" />
							Downloading...
						</Button>
					)}
					{state.status === "ready" && (
						<Button onClick={onDownload}>
							<RefreshCw className="h-4 w-4" />
							Restart Now
						</Button>
					)}
					{state.status === "error" && (
						<>
							<Button variant="secondary" onClick={onDismiss}>
								Dismiss
							</Button>
							<Button onClick={onDownload}>Try Again</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
