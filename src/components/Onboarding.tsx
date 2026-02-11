import { useState } from "react";
import type { NotificationSound } from "@/lib/sounds";
import { SetupScreen } from "./onboarding/SetupScreen";
import { WelcomeScreen } from "./onboarding/WelcomeScreen";
import { Button } from "./ui/button";

interface OnboardingProps {
  onComplete: () => void;
  defaultWorkingDir: string;
  onDefaultWorkingDirChange: (dir: string) => void;
  notificationSound: NotificationSound;
  onNotificationSoundChange: (sound: NotificationSound) => void;
}

export function Onboarding({
  onComplete,
  defaultWorkingDir,
  onDefaultWorkingDirChange,
  notificationSound,
  onNotificationSoundChange,
}: OnboardingProps) {
  const [step, setStep] = useState(0);

  return (
    <div className="flex flex-col h-full w-full bg-surface" style={{ overflow: "hidden" }}>
      {/* Drag region header */}
      <div
        data-tauri-drag-region
        className="border-b border-border bg-surface/80 backdrop-blur-md"
        style={{ height: 36, minHeight: 36 }}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div style={{ maxWidth: 520, padding: "0 32px", width: "100%" }}>
          {step === 0 ? (
            <WelcomeScreen />
          ) : (
            <SetupScreen
              workingDir={defaultWorkingDir}
              onWorkingDirChange={onDefaultWorkingDirChange}
              notificationSound={notificationSound}
              onNotificationSoundChange={onNotificationSoundChange}
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
