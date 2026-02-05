export type SessionStatus = "running" | "exited";

export type SidebarPosition = "left" | "right" | "top" | "bottom";

export interface Session {
  id: string;
  name: string;
  workingDir: string;
  command?: string;
  status: SessionStatus;
  createdAt: number;
}

export function generateSessionId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ses_";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function sessionDisplayName(session: Session): string {
  if (session.name) return session.name;
  if (session.workingDir) {
    const parts = session.workingDir.split("/");
    return parts[parts.length - 1] || session.workingDir;
  }
  return "Session";
}
