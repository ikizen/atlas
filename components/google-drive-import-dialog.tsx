"use client";

import { useState } from "react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  extractFolderId,
  fetchDriveFolder,
  type DriveFolder,
} from "@/lib/google-drive";
import { useAtlasStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface GoogleDriveImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── helpers ───────────────────────────────────────────────────────────────

function collectAllIds(folder: DriveFolder, into: Set<string>) {
  into.add(folder.id);
  folder.files.forEach((f) => into.add(f.id));
  folder.folders.forEach((sub) => collectAllIds(sub, into));
}

function hasSelectedDescendant(
  folder: DriveFolder,
  selected: Set<string>,
): boolean {
  if (folder.files.some((f) => selected.has(f.id))) return true;
  return folder.folders.some(
    (sub) => selected.has(sub.id) || hasSelectedDescendant(sub, selected),
  );
}

// ─── component ─────────────────────────────────────────────────────────────

export function GoogleDriveImportDialog({
  open,
  onOpenChange,
}: GoogleDriveImportDialogProps) {
  const addFolder = useAtlasStore((s) => s.addFolder);
  const addLink = useAtlasStore((s) => s.addLink);

  const [step, setStep] = useState<"link" | "preview" | "importing" | "done">(
    "link",
  );
  const [loading, setLoading] = useState(false);
  const [folderLink, setFolderLink] = useState("");
  const [driveData, setDriveData] = useState<DriveFolder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importStats, setImportStats] = useState({ folders: 0, links: 0 });

  // ── fetch ────────────────────────────────────────────────────────────────

  async function handleFetch() {
    setError(null);
    const folderId = extractFolderId(folderLink);
    if (!folderId) {
      setError("Couldn't find a folder ID in that link. Paste the full Drive URL.");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchDriveFolder(folderId);
      setDriveData(data);

      // Select everything by default
      const ids = new Set<string>();
      collectAllIds(data, ids);
      setSelectedIds(ids);

      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read Drive folder.");
    } finally {
      setLoading(false);
    }
  }

  // ── selection ────────────────────────────────────────────────────────────

  function toggleItem(id: string, isFolder: boolean) {
    if (!driveData) return;
    const next = new Set(selectedIds);

    if (next.has(id)) {
      next.delete(id);
      if (isFolder) {
        // Deselect all descendants
        const found = findFolder(driveData, id);
        if (found) {
          const desc = new Set<string>();
          collectAllIds(found, desc);
          desc.delete(found.id); // already removed above
          desc.forEach((x) => next.delete(x));
        }
      }
    } else {
      next.add(id);
      if (isFolder) {
        const found = findFolder(driveData, id);
        if (found) {
          const desc = new Set<string>();
          collectAllIds(found, desc);
          desc.forEach((x) => next.add(x));
        }
      }
    }

    setSelectedIds(next);
  }

  function findFolder(root: DriveFolder, id: string): DriveFolder | null {
    if (root.id === id) return root;
    for (const sub of root.folders) {
      const found = findFolder(sub, id);
      if (found) return found;
    }
    return null;
  }

  function selectAll() {
    if (!driveData) return;
    const ids = new Set<string>();
    collectAllIds(driveData, ids);
    setSelectedIds(ids);
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  // ── import ───────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!driveData) return;
    setStep("importing");

    let foldersCreated = 0;
    let linksCreated = 0;

    function importRecursive(folder: DriveFolder, parentId?: string) {
      // Only create the Atlas folder if it or any child is selected
      const shouldCreate =
        selectedIds.has(folder.id) || hasSelectedDescendant(folder, selectedIds);
      if (!shouldCreate) return;

      const atlasFolderId = addFolder(folder.name, "blue", parentId);
      foldersCreated++;

      // Add files as links
      folder.files.forEach((file) => {
        if (selectedIds.has(file.id)) {
          addLink(atlasFolderId, file.name, file.webViewLink);
          linksCreated++;
        }
      });

      // Recurse into subfolders
      folder.folders.forEach((sub) => importRecursive(sub, atlasFolderId));
    }

    importRecursive(driveData);

    setImportStats({ folders: foldersCreated, links: linksCreated });
    setStep("done");
    toast.success(`Imported ${linksCreated} link${linksCreated !== 1 ? "s" : ""} in ${foldersCreated} folder${foldersCreated !== 1 ? "s" : ""}`);
  }

  // ── reset & close ────────────────────────────────────────────────────────

  function handleClose(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setTimeout(() => {
        setStep("link");
        setDriveData(null);
        setFolderLink("");
        setError(null);
        setSelectedIds(new Set());
      }, 300);
    }
  }

  // ── count selected files (not folders) ───────────────────────────────────

  function countSelectedFiles(folder: DriveFolder): number {
    let n = folder.files.filter((f) => selectedIds.has(f.id)).length;
    folder.folders.forEach((sub) => {
      n += countSelectedFiles(sub);
    });
    return n;
  }

  const selectedFileCount = driveData ? countSelectedFiles(driveData) : 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Google Drive</DialogTitle>
          <DialogDescription>
            {step === "link" &&
              "Paste the link to a Google Drive folder. All files inside will be imported as links."}
            {step === "preview" &&
              "Choose which files and folders to import. Everything is selected by default."}
            {step === "importing" && "Creating folders and links in Atlas…"}
            {step === "done" && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: URL input ── */}
        {step === "link" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="folder-link">Google Drive folder URL</Label>
              <Input
                id="folder-link"
                placeholder="https://drive.google.com/drive/folders/…"
                value={folderLink}
                onChange={(e) => {
                  setFolderLink(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && folderLink) void handleFetch();
                }}
                autoFocus
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Atlas uses your existing Google sign-in — no extra permissions dialog.
            </p>
          </div>
        )}

        {/* ── Step 2: Preview tree ── */}
        {step === "preview" && driveData && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{selectedFileCount} file{selectedFileCount !== 1 ? "s" : ""} selected</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  onClick={selectAll}
                >
                  All
                </button>
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  onClick={deselectAll}
                >
                  None
                </button>
              </div>
            </div>
            <div className="atlas-scroll max-h-72 overflow-y-auto rounded-lg border p-1">
              <FolderTree
                folder={driveData}
                selectedIds={selectedIds}
                onToggle={toggleItem}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        {/* ── Step 3: Importing ── */}
        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2Icon className="size-10 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Importing…</p>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2Icon className="size-12 text-emerald-500" />
            <div>
              <p className="font-semibold">
                {importStats.links} link{importStats.links !== 1 ? "s" : ""} imported
              </p>
              <p className="text-sm text-muted-foreground">
                Across {importStats.folders} folder{importStats.folders !== 1 ? "s" : ""} in Atlas
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "link" && (
            <Button
              className="w-full"
              onClick={handleFetch}
              disabled={loading || !folderLink.trim()}
            >
              {loading && <Loader2Icon className="size-4 animate-spin" />}
              {loading ? "Fetching folder…" : "Preview contents"}
            </Button>
          )}
          {step === "preview" && (
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("link")}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => void handleImport()}
                disabled={selectedFileCount === 0}
              >
                Import {selectedFileCount > 0 ? `(${selectedFileCount})` : ""}
              </Button>
            </div>
          )}
          {step === "done" && (
            <Button className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── FolderTree component ────────────────────────────────────────────────────

function FolderTree({
  folder,
  selectedIds,
  onToggle,
  level = 0,
}: {
  folder: DriveFolder;
  selectedIds: Set<string>;
  onToggle: (id: string, isFolder: boolean) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = folder.files.length > 0 || folder.folders.length > 0;
  const isSelected = selectedIds.has(folder.id);

  return (
    <div>
      {/* Folder row */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
          !isSelected && "opacity-50",
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <button
          type="button"
          className="size-4 shrink-0 text-muted-foreground"
          onClick={() => hasChildren && setExpanded((e) => !e)}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )
          ) : null}
        </button>
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 text-left"
          onClick={() => onToggle(folder.id, true)}
        >
          <FolderIcon className="size-4 shrink-0 text-blue-400" />
          <span className="min-w-0 flex-1 truncate font-medium">
            {folder.name}
          </span>
          <Checkbox checked={isSelected} />
        </button>
      </div>

      {/* Children */}
      {expanded && (
        <div>
          {folder.files.map((file) => {
            const fileSelected = selectedIds.has(file.id);
            return (
              <button
                key={file.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
                  !fileSelected && "opacity-50",
                )}
                style={{ paddingLeft: `${(level + 1) * 16 + 8 + 16}px` }}
                onClick={() => onToggle(file.id, false)}
              >
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-left text-xs">
                  {file.name}
                </span>
                <Checkbox checked={fileSelected} />
              </button>
            );
          })}
          {folder.folders.map((sub) => (
            <FolderTree
              key={sub.id}
              folder={sub}
              selectedIds={selectedIds}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "ml-2 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
        checked
          ? "border-blue-500 bg-blue-500 text-white"
          : "border-muted-foreground",
      )}
    >
      {checked && (
        <svg viewBox="0 0 10 8" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
