import { useState } from "react";
import { GitBranch, Circle, TerminalSquare } from "lucide-react";
import { Button } from "./ui/button";
import { WorkingDirectoryInput } from "./shared/WorkingDirectoryInput";

interface OnboardingProps {
  onComplete: () => void;
  defaultWorkingDir: string;
  onDefaultWorkingDirChange: (dir: string) => void;
}

const CONCEPTS = [
  {
    icon: GitBranch,
    title: "Auto Worktree",
    description:
      "Each session gets its own git worktree so work stays isolated. Branches use auto-generated names.",
    hint: (
      <span>
        <kbd className="font-mono text-foreground-muted">⌘T</kbd> new session{" "}
        <kbd className="font-mono text-foreground-muted">⌘⇧T</kbd> without worktree
      </span>
    ),
  },
  {
    icon: Circle,
    title: "Status Indicator",
    description: "The colored dot next to each session shows Claude's state.",
    hint: (
      <span className="flex items-center" style={{ gap: 12, flexWrap: "wrap" }}>
        <span className="flex items-center" style={{ gap: 4 }}>
          <span
            className="inline-block rounded-full bg-green-400"
            style={{ width: 8, height: 8, animation: "pulse-green 2s infinite" }}
          />
          running
        </span>
        <span className="flex items-center" style={{ gap: 4 }}>
          <span
            className="inline-block rounded-full bg-green-400"
            style={{ width: 8, height: 8 }}
          />
          finished
        </span>
        <span className="flex items-center" style={{ gap: 4 }}>
          <span
            className="inline-block rounded-full bg-red-400"
            style={{ width: 8, height: 8 }}
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
      <span>
        <kbd className="font-mono text-foreground-muted">⌘F</kbd> search{" "}
        <kbd className="font-mono text-foreground-muted">⌘J</kbd> toggle panel
      </span>
    ),
  },
];

export function Onboarding({
  onComplete,
  defaultWorkingDir,
  onDefaultWorkingDirChange,
}: OnboardingProps) {
  const [step, setStep] = useState(0);

  return (
    <div
      className="flex flex-col h-full w-full bg-surface"
      style={{ overflow: "hidden" }}
    >
      {/* Drag region header */}
      <div
        data-tauri-drag-region
        className="border-b border-border bg-surface/80 backdrop-blur-md"
        style={{ height: 36, minHeight: 36 }}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div style={{ maxWidth: 420, padding: "0 24px", width: "100%" }}>
          {step === 0 ? (
            <WelcomeScreen />
          ) : (
            <WorkingDirScreen
              value={defaultWorkingDir}
              onChange={onDefaultWorkingDirChange}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t border-border"
        style={{ padding: "16px 24px" }}
      >
        <StepDots current={step} total={2} />
        <div className="flex" style={{ gap: 8 }}>
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 0 ? (
            <Button size="sm" onClick={() => setStep(1)}>
              Next
            </Button>
          ) : (
            <Button size="sm" onClick={onComplete}>
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <>
      <h1
        className="text-2xl font-semibold text-foreground"
        style={{ marginBottom: 6 }}
      >
        Welcome to Clutch
      </h1>
      <p
        className="text-sm text-foreground-muted"
        style={{ marginBottom: 32 }}
      >
        A few things to know before you get started.
      </p>

      <div>
        {CONCEPTS.map((c, i) => (
          <div key={c.title}>
            {i > 0 && (
              <div className="border-t border-border" style={{ marginLeft: 36 }} />
            )}
            <div className="flex" style={{ gap: 14, padding: "20px 0" }}>
              <div style={{ paddingTop: 2 }}>
                <c.icon className="h-5 w-5 text-foreground-muted" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground" style={{ marginBottom: 4 }}>
                  {c.title}
                </p>
                <p className="text-sm text-foreground-muted" style={{ lineHeight: 1.5, marginBottom: 6 }}>
                  {c.description}
                </p>
                <div className="text-xs text-foreground-muted" style={{ opacity: 0.7 }}>
                  {c.hint}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function WorkingDirScreen({
  value,
  onChange,
}: {
  value: string;
  onChange: (dir: string) => void;
}) {
  return (
    <>
      <h1
        className="text-2xl font-semibold text-foreground"
        style={{ marginBottom: 8 }}
      >
        Working Directory
      </h1>
      <p
        className="text-base text-foreground-muted"
        style={{ marginBottom: 28 }}
      >
        Choose where new sessions start. You can always change this later in Settings.
      </p>

      <WorkingDirectoryInput showHeader={false} value={value} onChange={onChange} />
    </>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full ${i === current ? "bg-primary" : "bg-border"}`}
          style={{ width: 7, height: 7 }}
        />
      ))}
    </div>
  );
}
