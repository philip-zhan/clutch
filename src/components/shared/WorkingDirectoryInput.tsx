import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { Button } from "../ui/button";

interface WorkingDirectoryInputProps {
  value: string;
  onChange: (directory: string) => void;
  showHeader?: boolean;
}

export function WorkingDirectoryInput({
  value,
  onChange,
  showHeader = true,
}: WorkingDirectoryInputProps) {
  const handleSelectDirectory = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Working Directory",
    });
    if (selected) {
      onChange(selected);
    }
  };

  return (
    <div>
      {showHeader && (
        <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
          <div
            className="flex items-center justify-center rounded-lg bg-surface-elevated"
            style={{ width: 36, height: 36 }}
          >
            <FolderOpen className="h-4 w-4 text-foreground-muted" />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">Working Directory</h3>
            <p className="text-sm text-foreground-subtle">Directory where sessions will start</p>
          </div>
        </div>
      )}

      <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
        <Button variant="outline" size="sm" onClick={handleSelectDirectory}>
          Choose...
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange("")} disabled={!value}>
          Clear
        </Button>
      </div>

      <input
        className="w-full text-base text-foreground font-mono bg-surface-elevated/50 rounded-md border border-border focus:border-primary focus:outline-none"
        style={{ padding: "10px 14px", height: 40 }}
        placeholder="Using home directory"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  );
}
