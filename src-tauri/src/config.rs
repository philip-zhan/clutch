/// Central feature flags for the Clutch backend.

/// Remove stale session dirs from `~/.clutch/sessions/` on app startup (crash recovery).
pub const CLEANUP_STALE_SESSIONS_ON_STARTUP: bool = true;

/// Returns the base directory name: `.clutch-dev` in debug builds, `.clutch` in release.
pub fn base_dir_name() -> &'static str {
    if cfg!(debug_assertions) {
        ".clutch-dev"
    } else {
        ".clutch"
    }
}

/// Cross-platform home directory resolution.
/// Uses USERPROFILE on Windows, HOME on Unix.
pub fn home_dir() -> Result<String, String> {
    #[cfg(windows)]
    {
        std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .map_err(|_| "Cannot determine home directory (USERPROFILE not set)".to_string())
    }
    #[cfg(not(windows))]
    {
        std::env::var("HOME")
            .map_err(|_| "HOME environment variable not set".to_string())
    }
}
