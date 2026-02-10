import { useEffect, useState } from "react";
import { WorkingDirectoryInput } from "./shared/WorkingDirectoryInput";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCommand: string;
  defaultWorkingDir: string;
  onCreate: (name: string, workingDir: string, command: string) => void;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  defaultCommand,
  defaultWorkingDir,
  onCreate,
}: NewSessionDialogProps) {
  const [name, setName] = useState("");
  const [workingDir, setWorkingDir] = useState(defaultWorkingDir);
  const [command, setCommand] = useState(defaultCommand);

  // Reset form when dialog opens (including after store hydration on restart)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on open change
  useEffect(() => {
    if (open) {
      setName("");
      setWorkingDir(defaultWorkingDir);
      setCommand(defaultCommand);
    }
  }, [open]);

  const handleCreate = () => {
    onCreate(name.trim(), workingDir, command.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ width: 480 }}>
        <DialogClose onClick={() => onOpenChange(false)} />

        <DialogHeader>
          <DialogTitle>New Session</DialogTitle>
          <DialogDescription>Create a new terminal session.</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <Label style={{ display: "block", marginBottom: 8 }}>
                Session Name
                <span className="text-foreground-subtle font-normal">
                  {" "}
                  (optional)
                </span>
              </Label>
              <input
                className="w-full rounded-lg border border-border bg-surface-elevated text-sm text-foreground focus:border-primary focus:outline-none"
                style={{ padding: "8px 12px", height: 36 }}
                placeholder="Auto-derived from directory"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>

            <div>
              <Label style={{ display: "block", marginBottom: 8 }}>
                Command
              </Label>
              <input
                className="w-full rounded-lg border border-border bg-surface-elevated text-sm text-foreground font-mono focus:border-primary focus:outline-none"
                style={{ padding: "8px 12px", height: 36 }}
                placeholder="Leave empty for a plain shell"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <p
                className="text-xs text-foreground-subtle"
                style={{ marginTop: 6 }}
              >
                e.g. <code className="font-mono">claude</code>,{" "}
                <code className="font-mono">claude --profile architect</code>,
                or leave empty for shell
              </p>
            </div>

            <WorkingDirectoryInput
              value={workingDir}
              onChange={setWorkingDir}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
