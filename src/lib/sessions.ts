import {
	uniqueNamesGenerator,
	adjectives,
	colors,
	animals,
} from "unique-names-generator";

export type SessionStatus = "running" | "exited";

export type ClaudeActivityState =
	| "idling"
	| "running"
	| "finished"
	| "needs_input";

export type SidebarPosition = "left" | "right" | "top" | "bottom";

export type WorktreeLocation = "sibling" | "home" | "custom";

export interface Session {
	id: string;
	name: string;
	workingDir: string;
	command?: string;
	status: SessionStatus;
	createdAt: number;
	worktreePath?: string;
	gitRepoPath?: string;
	originalWorkingDir?: string;
	activityState?: ClaudeActivityState;
	gitBranch?: string;
}

export function generateSessionId(): string {
	return uniqueNamesGenerator({
		dictionaries: [adjectives, colors, animals],
		separator: "-",
		length: 3,
	});
}

export function sessionDisplayName(session: Session): string {
	if (session.name) return session.name;
	const dir = session.originalWorkingDir || session.workingDir;
	if (dir) {
		const parts = dir.split("/");
		return parts[parts.length - 1] || dir;
	}
	return "Session";
}
