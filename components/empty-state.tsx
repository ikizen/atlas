"use client";

import { FolderPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <FolderPlusIcon className="size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight">
          Build your launcher
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create a folder for a client or a category, then drop in the
          spreadsheets and links you open every day.
        </p>
      </div>
      <Button onClick={onCreate}>
        <FolderPlusIcon /> Create your first folder
      </Button>
    </div>
  );
}
