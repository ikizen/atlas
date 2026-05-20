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
import { normalizeUrl, titleFromUrl } from "@/lib/url";

export interface LinkDraft {
  title: string;
  url: string;
}

export function LinkDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: LinkDraft;
  onSubmit: (draft: LinkDraft) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");

  // Reset the form to the latest initial values each time the dialog opens
  // (state adjustment during render — no effect needed).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(initial?.title ?? "");
      setUrl(initial?.url ?? "");
    }
  }

  function submit() {
    const cleanUrl = normalizeUrl(url);
    if (!cleanUrl) return;
    onSubmit({
      title: title.trim() || titleFromUrl(cleanUrl),
      url: cleanUrl,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add link" : "Edit link"}
          </DialogTitle>
          <DialogDescription>
            Paste a URL — the title and icon fill in automatically.
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
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              autoFocus
              value={url}
              placeholder="docs.google.com/spreadsheets/…"
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => {
                if (!title.trim() && url.trim()) {
                  setTitle(titleFromUrl(normalizeUrl(url)));
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-title">Title</Label>
            <Input
              id="link-title"
              value={title}
              placeholder="e.g. Q3 P&L Model"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!url.trim()}>
              {mode === "create" ? "Add link" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
