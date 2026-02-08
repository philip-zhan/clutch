use serde::Serialize;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Clone)]
pub struct WorktreeSetupResult {
    pub effective_dir: String,
    pub worktree_path: Option<String>,
    pub git_repo_path: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct WorktreeRemoveResult {
    pub success: bool,
    pub error: Option<String>,
}

/// Run `git rev-parse --show-toplevel` to find the repo root, if any.
pub fn find_git_root(dir: &str) -> Option<String> {
    let output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(dir)
        .output()
        .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}

/// Create a worktree for the given session.
///
/// `location` is one of: "sibling", "home", or an absolute custom path.
/// - "sibling": creates `{repo_root}-{session_id}` next to the repo
/// - "home": creates `~/.claude-worktrees/{repo_name}/{session_id}`
/// - custom path: creates `{custom_path}/{repo_name}/{session_id}`
pub fn create_worktree(
    repo_root: &str,
    session_id: &str,
    location: &str,
    branch_prefix: &str,
) -> Result<String, String> {
    let repo_path = Path::new(repo_root);
    let repo_name = repo_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("repo");

    let branch_name = format!("{}{}", branch_prefix, session_id);
    // Use branch name as folder name, replacing `/` with `-` for filesystem safety
    let folder_name = branch_name.replace('/', "-");

    let worktree_path = match location {
        "sibling" => {
            let parent = repo_path
                .parent()
                .ok_or_else(|| "Cannot determine parent directory of repo".to_string())?;
            parent
                .join(&folder_name)
                .to_string_lossy()
                .to_string()
        }
        "home" => {
            let home = std::env::var("HOME")
                .map_err(|_| "Cannot determine home directory".to_string())?;
            Path::new(&home)
                .join(".clutch")
                .join("worktrees")
                .join(repo_name)
                .join(&folder_name)
                .to_string_lossy()
                .to_string()
        }
        custom => {
            Path::new(custom)
                .join(repo_name)
                .join(&folder_name)
                .to_string_lossy()
                .to_string()
        }
    };

    // Ensure parent directory exists for non-sibling locations
    if location != "sibling" {
        if let Some(parent) = Path::new(&worktree_path).parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create worktree parent directory: {}", e))?;
        }
    }

    let output = Command::new("git")
        .args([
            "worktree",
            "add",
            "-b",
            &branch_name,
            &worktree_path,
        ])
        .current_dir(repo_root)
        .output()
        .map_err(|e| format!("Failed to run git worktree add: {}", e))?;

    if output.status.success() {
        Ok(worktree_path)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("git worktree add failed: {}", stderr.trim()))
    }
}

/// Orchestrate worktree setup for a session. Never errors — returns
/// the original dir on failure so the session can still proceed.
pub fn setup_worktree_for_session(
    working_dir: &str,
    session_id: &str,
    location: &str,
    branch_prefix: &str,
) -> WorktreeSetupResult {
    let fallback = WorktreeSetupResult {
        effective_dir: working_dir.to_string(),
        worktree_path: None,
        git_repo_path: None,
    };

    let repo_root = match find_git_root(working_dir) {
        Some(root) => root,
        None => return fallback,
    };

    match create_worktree(&repo_root, session_id, location, branch_prefix) {
        Ok(wt_path) => WorktreeSetupResult {
            effective_dir: wt_path.clone(),
            worktree_path: Some(wt_path),
            git_repo_path: Some(repo_root),
        },
        Err(_) => fallback,
    }
}

/// Remove a worktree and best-effort delete its branch.
pub fn remove_worktree(repo_root: &str, worktree_path: &str) -> WorktreeRemoveResult {
    let output = Command::new("git")
        .args(["worktree", "remove", worktree_path])
        .current_dir(repo_root)
        .output();

    match output {
        Ok(o) if o.status.success() => {
            // Best-effort: extract branch name from worktree path and delete it.
            // The branch name was set during creation; we try to infer it from
            // `git worktree list --porcelain` but that's fragile. Instead, we
            // rely on `git branch -d` which only deletes if fully merged.
            // The branch cleanup is best-effort — if it fails, that's fine.
            let _ = try_delete_worktree_branch(repo_root, worktree_path);

            WorktreeRemoveResult {
                success: true,
                error: None,
            }
        }
        Ok(o) => {
            let stderr = String::from_utf8_lossy(&o.stderr).trim().to_string();
            WorktreeRemoveResult {
                success: false,
                error: Some(stderr),
            }
        }
        Err(e) => WorktreeRemoveResult {
            success: false,
            error: Some(format!("Failed to run git worktree remove: {}", e)),
        },
    }
}

/// Get the current git branch name for a directory.
/// Returns the branch name, or None if not in a git repo.
pub fn get_branch(dir: &str) -> Option<String> {
    let output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(dir)
        .output()
        .ok()?;

    if output.status.success() {
        let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if branch.is_empty() {
            None
        } else {
            Some(branch)
        }
    } else {
        None
    }
}

/// Best-effort: find and delete the branch associated with a worktree.
fn try_delete_worktree_branch(repo_root: &str, worktree_path: &str) {
    // Use `git worktree list --porcelain` to find the branch, but since the
    // worktree is already removed, we try to infer the branch from the path.
    // The worktree path ends with the session_id, and the branch is `{prefix}{session_id}`.
    // Since we don't know the prefix here, we list branches and look for ones
    // that match the session_id suffix from the path.
    let wt = Path::new(worktree_path);
    let session_id = match wt.file_name().and_then(|n| n.to_str()) {
        Some(name) => name,
        None => return,
    };

    // List branches matching this session_id
    let output = Command::new("git")
        .args(["branch", "--list", &format!("*{}", session_id)])
        .current_dir(repo_root)
        .output();

    if let Ok(o) = output {
        if o.status.success() {
            let branches = String::from_utf8_lossy(&o.stdout);
            for line in branches.lines() {
                let branch = line.trim().trim_start_matches("* ");
                if branch.ends_with(session_id) {
                    let _ = Command::new("git")
                        .args(["branch", "-d", branch])
                        .current_dir(repo_root)
                        .output();
                }
            }
        }
    }
}
