"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCENTS } from "@/lib/accents";
import type { AccentKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface FolderDraft {
  name: string;
  accent: AccentKey;
}

export function FolderDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: FolderDraft;
  onSubmit: (draft: FolderDraft) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [accent, setAccent] = useState<AccentKey>(initial?.accent ?? "slate");

  // Reset the form to the latest initial values each time the dialog opens
  // (state adjustment during render — no effect needed).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initial?.name ?? "");
      setAccent(initial?.accent ?? "slate");
    }
  }

  function submit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), accent });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New folder" : "Edit folder"}
          </DialogTitle>
          <DialogDescription>
            Group client sheets and links under a colored folder.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              autoFocus
              value={name}
              placeholder="e.g. Acme Corp"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Accent</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  title={a.label}
                  aria-label={a.label}
                  aria-pressed={accent === a.key}
                  onClick={() => setAccent(a.key)}
                  className={cn(
                    "size-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    accent === a.key && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: a.color }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {mode === "create" ? "Create folder" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
