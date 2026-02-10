import type { ISearchOptions, SearchAddon } from "@xterm/addon-search";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface TerminalSearchBarProps {
  searchAddon: SearchAddon;
  onClose: () => void;
  onSearchChange?: (query: string, options: ISearchOptions) => void;
}

export function TerminalSearchBar({
  searchAddon,
  onClose,
  onSearchChange,
}: TerminalSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [resultIndex, setResultIndex] = useState(-1);
  const [resultCount, setResultCount] = useState(0);

  const getSearchOptions = useCallback(
    (incremental = false): ISearchOptions => ({
      caseSensitive,
      regex,
      incremental,
      decorations: {
        matchBackground: "#3b82f633",
        matchBorder: "#3b82f666",
        matchOverviewRuler: "#3b82f6",
        activeMatchBackground: "#3b82f699",
        activeMatchBorder: "#3b82f6",
        activeMatchColorOverviewRuler: "#60a5fa",
      },
    }),
    [caseSensitive, regex],
  );

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Subscribe to result changes
  useEffect(() => {
    const disposable = searchAddon.onDidChangeResults?.(
      (e: { resultIndex: number; resultCount: number }) => {
        setResultIndex(e.resultIndex);
        setResultCount(e.resultCount);
      },
    );
    return () => disposable?.dispose();
  }, [searchAddon]);

  // Live search on query/options change
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit deps for clarity
  useEffect(() => {
    const options = getSearchOptions(true);
    if (query) {
      searchAddon.findNext(query, options);
    } else {
      searchAddon.clearDecorations();
      setResultIndex(-1);
      setResultCount(0);
    }
    onSearchChange?.(query, options);
  }, [query, caseSensitive, regex, searchAddon, getSearchOptions, onSearchChange]);

  // Clear decorations on unmount
  useEffect(() => {
    return () => {
      searchAddon.clearDecorations();
    };
  }, [searchAddon]);

  const findNext = () => {
    if (query) searchAddon.findNext(query, getSearchOptions());
  };

  const findPrevious = () => {
    if (query) searchAddon.findPrevious(query, getSearchOptions());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();

    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      findPrevious();
    } else if (e.key === "Enter") {
      e.preventDefault();
      findNext();
    } else if (e.key === "g" && e.metaKey && e.shiftKey) {
      e.preventDefault();
      findPrevious();
    } else if (e.key === "g" && e.metaKey) {
      e.preventDefault();
      findNext();
    }
  };

  const renderMatchCount = () => {
    if (!query) return null;
    if (resultCount === 0) {
      return (
        <span className="text-xs text-foreground-subtle" style={{ whiteSpace: "nowrap" }}>
          No results
        </span>
      );
    }
    if (resultIndex === -1) {
      return (
        <span className="text-xs text-foreground-muted" style={{ whiteSpace: "nowrap" }}>
          {resultCount}+ found
        </span>
      );
    }
    return (
      <span className="text-xs text-foreground-muted" style={{ whiteSpace: "nowrap" }}>
        {resultIndex + 1} of {resultCount}
      </span>
    );
  };

  return (
    <div
      className="search-bar-enter rounded-lg border border-border bg-surface-elevated shadow-md"
      style={{
        position: "absolute",
        top: 8,
        right: 16,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "4px 6px",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        spellCheck={false}
        className="bg-transparent text-sm text-foreground outline-none font-mono"
        style={{ width: 160, padding: "2px 6px" }}
      />

      {/* Case sensitivity toggle */}
      <Button
        variant="ghost"
        title="Match Case"
        onClick={() => setCaseSensitive(!caseSensitive)}
        className={`rounded text-xs font-mono font-bold ${
          caseSensitive
            ? "text-primary bg-primary/20"
            : "text-foreground-subtle hover:text-foreground-muted"
        }`}
        style={{ padding: "2px 5px", lineHeight: 1.4, height: "auto" }}
      >
        Aa
      </Button>

      {/* Regex toggle */}
      <Button
        variant="ghost"
        title="Use Regular Expression"
        onClick={() => setRegex(!regex)}
        className={`rounded text-xs font-mono font-bold ${
          regex
            ? "text-primary bg-primary/20"
            : "text-foreground-subtle hover:text-foreground-muted"
        }`}
        style={{ padding: "2px 5px", lineHeight: 1.4, height: "auto" }}
      >
        .*
      </Button>

      {/* Separator + match count */}
      <div
        className="border-l border-border"
        style={{ height: 16, marginLeft: 2, marginRight: 4 }}
      />
      <div style={{ minWidth: 56, textAlign: "center" }}>{renderMatchCount()}</div>
      <div
        className="border-l border-border"
        style={{ height: 16, marginLeft: 2, marginRight: 2 }}
      />

      {/* Navigation */}
      <Button
        variant="ghost"
        title="Previous Match (Shift+Enter)"
        onClick={findPrevious}
        className="rounded text-foreground-subtle hover:text-foreground-muted hover:bg-surface-hover"
        style={{ padding: 3, height: "auto" }}
      >
        <ChevronUp size={14} />
      </Button>
      <Button
        variant="ghost"
        title="Next Match (Enter)"
        onClick={findNext}
        className="rounded text-foreground-subtle hover:text-foreground-muted hover:bg-surface-hover"
        style={{ padding: 3, height: "auto" }}
      >
        <ChevronDown size={14} />
      </Button>

      {/* Close */}
      <Button
        variant="ghost"
        title="Close (Escape)"
        onClick={onClose}
        className="rounded text-foreground-subtle hover:text-foreground-muted hover:bg-surface-hover"
        style={{ padding: 3, marginLeft: 2, height: "auto" }}
      >
        <X size={14} />
      </Button>
    </div>
  );
}
