"use client";

import { useRef, useState } from "react";
import { DownloadIcon, SettingsIcon, UploadIcon, CloudIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAtlasStore } from "@/lib/store";
import { normalize } from "@/lib/data/localStorageProvider";
import { GoogleDriveImportDialog } from "@/components/google-drive-import-dialog";

export function DataMenu() {
  const exportData = useAtlasStore((s) => s.exportData);
  const replaceAll = useAtlasStore((s) => s.replaceAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [driveOpen, setDriveOpen] = useState(false);

  function handleExport() {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `atlas-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = normalize(parsed);
      replaceAll(data);
      toast.success("Data imported", {
        description: `${data.folders.length} folders, ${
          Object.keys(data.links).length
        } links restored.`,
      });
    } catch {
      toast.error("Import failed", {
        description: "That file isn't a valid Atlas backup.",
      });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Data menu" />
          }
        >
          <SettingsIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Backup &amp; restore</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExport}>
              <DownloadIcon /> Export data (.json)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileRef.current?.click()}>
              <UploadIcon /> Import data…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDriveOpen(true)}>
              <CloudIcon /> Import from Google Drive
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <GoogleDriveImportDialog open={driveOpen} onOpenChange={setDriveOpen} />

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
