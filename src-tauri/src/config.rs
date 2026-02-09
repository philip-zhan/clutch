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
