import { FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "../ui/button";

interface WorkingDirectoryInputProps {
	value: string;
	onChange: (directory: string) => void;
	showHeader?: boolean;
}

export function WorkingDirectoryInput({ value, onChange, showHeader = true }: WorkingDirectoryInputProps) {
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
				<div
					className="flex items-center"
					style={{ gap: 12, marginBottom: 20 }}
				>
					<div
						className="flex items-center justify-center rounded-lg bg-surface-elevated"
						style={{ width: 36, height: 36 }}
					>
						<FolderOpen className="h-4 w-4 text-foreground-muted" />
					</div>
					<div>
						<h3 className="text-sm font-medium text-foreground">
							Working Directory
						</h3>
						<p className="text-xs text-foreground-subtle">
							Directory where sessions will start
						</p>
					</div>
				</div>
			)}

			<div
				className="flex items-center"
				style={{ gap: 12, marginBottom: 16 }}
			>
				<Button
					variant="outline"
					size="sm"
					onClick={handleSelectDirectory}
				>
					Choose...
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onChange("")}
					disabled={!value}
				>
					Clear
				</Button>
			</div>

			<p
				className="text-sm text-foreground-muted font-mono bg-surface-elevated/50 rounded-md"
				style={{ padding: "10px 14px" }}
			>
				{value || "Using home directory"}
			</p>
		</div>
	);
}
