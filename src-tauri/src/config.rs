/// Central feature flags for the Clutch backend.

/// Remove stale session dirs from `~/.clutch/sessions/` on app startup (crash recovery).
pub const CLEANUP_STALE_SESSIONS_ON_STARTUP: bool = false;
