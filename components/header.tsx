"use client";

import { FolderPlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DataMenu } from "@/components/data-menu";

export function Header({
  onOpenSearch,
  onNewFolder,
}: {
  onOpenSearch: () => void;
  onNewFolder: () => void;
}) {
  return (
    <header className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
          <span className="text-sm font-bold">A</span>
        </span>
        <span className="text-base font-semibold tracking-tight">Atlas</span>
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="group/search ml-2 flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border bg-card/40 px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 text-left">Search links and folders…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1">
        <Button
          onClick={onNewFolder}
          size="sm"
          className="gap-1.5"
          aria-label="New folder"
        >
          <FolderPlusIcon className="size-4" />
          <span className="hidden sm:inline">New folder</span>
        </Button>
        <ThemeToggle />
        <DataMenu />
      </div>
    </header>
  );
}
