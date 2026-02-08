/** A tab persisted across restarts. Worktree tabs have the optional git fields set. */
export interface PersistedTab {
	id: string; // nanoid, stable across restarts
	workingDir: string; // effective dir (worktree path or original)
	command?: string;
	createdAt: number;
	// Worktree-specific (present only for worktree tabs)
	branchName?: string;
	worktreePath?: string; // absolute path to worktree dir on disk
	gitRepoPath?: string; // absolute path to original repo root
	originalWorkingDir?: string; // user's original working dir
}
