import { nanoid } from "nanoid";
import {
	uniqueNamesGenerator,
	adjectives,
	colors,
	animals,
} from "unique-names-generator";
import type { Worktree } from "./worktrees";

export type SessionStatus = "running" | "exited";

export type ClaudeActivityState =
	| "idling"
	| "running"
	| "finished"
	| "needs_input";

export type SidebarPosition = "left" | "right" | "top" | "bottom";

export type WorktreeLocation = "sibling" | "home" | "custom";

export interface Session {
	id: string; // nanoid — ephemeral, regenerated each app start
	name: string;
	workingDir: string; // effective dir (worktree path or original)
	command?: string;
	status: SessionStatus;
	createdAt: number;
	worktreeId?: string; // FK → Worktree.id (undefined for main-branch session)
	activityState?: ClaudeActivityState;
	gitBranch?: string;
}

export function generateSessionId(): string {
	return nanoid();
}

export function generateBranchName(): string {
	return uniqueNamesGenerator({
		dictionaries: [adjectives, colors, animals],
		separator: "-",
		length: 3,
	});
}

export function sessionDisplayName(
	session: Session,
	worktree?: Worktree,
): string {
	if (session.name) return session.name;
	const dir = worktree?.originalWorkingDir || session.workingDir;
	if (dir) {
		const parts = dir.split("/");
		return parts[parts.length - 1] || dir;
	}
	return "Session";
}
