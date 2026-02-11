import { Circle, GitBranch, TerminalSquare } from "lucide-react";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="font-mono text-foreground-muted bg-surface-elevated border border-border rounded"
      style={{ padding: "2px 6px", fontSize: 12, lineHeight: "18px" }}
    >
      {children}
    </kbd>
  );
}

const CONCEPTS = [
  {
    icon: GitBranch,
    title: "Auto Worktree",
    description:
      "Each session gets its own git worktree so work stays isolated. Branches use auto-generated names.",
    hint: (
      <span className="flex items-center" style={{ gap: 8 }}>
        <Kbd>⌘T</Kbd> <span>new session</span>
        <Kbd>⌘⇧T</Kbd> <span>without worktree</span>
      </span>
    ),
  },
  {
    icon: Circle,
    title: "Status Indicator",
    description: "The colored dot next to each session shows Claude's state.",
    hint: (
      <span className="flex items-center" style={{ gap: 14, flexWrap: "wrap" }}>
        <span className="flex items-center" style={{ gap: 6 }}>
          <span
            className="inline-block rounded-full"
            style={{
              width: 9,
              height: 9,
              backgroundColor: "#22c55e",
              animation: "pulse-green 2s ease-in-out infinite",
            }}
          />
          running
        </span>
        <span className="flex items-center" style={{ gap: 6 }}>
          <span
            className="inline-block rounded-full"
            style={{ width: 9, height: 9, backgroundColor: "#22c55e" }}
          />
          finished
        </span>
        <span className="flex items-center" style={{ gap: 6 }}>
          <span
            className="inline-block rounded-full"
            style={{ width: 9, height: 9, backgroundColor: "#ef4444" }}
          />
          needs input
        </span>
      </span>
    ),
  },
  {
    icon: TerminalSquare,
    title: "Built-in Terminal",
    description: "Full terminal with search, split panels, and clickable links.",
    hint: (
      <span className="flex items-center" style={{ gap: 8 }}>
        <Kbd>⌘F</Kbd> <span>search</span>
        <Kbd>⌘J</Kbd> <span>toggle panel</span>
      </span>
    ),
  },
];

export function WelcomeScreen() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground" style={{ marginBottom: 6 }}>
        Welcome to Clutch
      </h1>
      <p className="text-sm text-foreground-muted" style={{ marginBottom: 32 }}>
        A few things to know before you get started.
      </p>

      <div>
        {CONCEPTS.map((c, i) => (
          <div key={c.title}>
            {i > 0 && <div className="border-t border-border" style={{ marginLeft: 37 }} />}
            <div className="flex" style={{ gap: 16, padding: "24px 0" }}>
              <div style={{ paddingTop: 3 }}>
                <c.icon className="h-5 w-5 text-foreground-muted" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground" style={{ marginBottom: 6 }}>
                  {c.title}
                </p>
                <p
                  className="text-sm text-foreground-muted"
                  style={{ lineHeight: 1.6, marginBottom: 8 }}
                >
                  {c.description}
                </p>
                <div className="text-sm text-foreground-muted">{c.hint}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
