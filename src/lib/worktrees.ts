export interface Worktree {
	id: string; // nanoid, stable across restarts
	branchName: string; // e.g. "clutch/brave-golden-falcon"
	worktreePath: string; // absolute path to worktree dir on disk
	gitRepoPath: string; // absolute path to original repo root
	originalWorkingDir: string; // user's original working dir
	command?: string; // command to run (e.g. "claude")
	createdAt: number;
}
