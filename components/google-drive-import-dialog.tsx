"use client";

import { useState } from "react";
import { Loader2Icon, FolderIcon, FileIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
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
import { initGoogleApi, authenticate, fetchDriveFolder, type DriveFolder } from "@/lib/google-drive";
import { useAtlasStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface GoogleDriveImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleDriveImportDialog({
  open,
  onOpenChange,
}: GoogleDriveImportDialogProps) {
  const addFolder = useAtlasStore((s) => s.addFolder);
  const addLink = useAtlasStore((s) => s.addLink);

  const [step, setStep] = useState<"link" | "preview" | "importing" | "success">("link");
  const [loading, setLoading] = useState(false);
  const [folderLink, setFolderLink] = useState("");
  const [driveData, setDriveData] = useState<DriveFolder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function handleConnect() {
    try {
      setLoading(true);
      await initGoogleApi();
      await authenticate();

      const folderId = extractFolderId(folderLink);
      if (!folderId) {
        toast.error("Invalid Google Drive folder link");
        return;
      }

      const data = await fetchDriveFolder(folderId);
      setDriveData(data);

      // Select all by default
      const ids = new Set<string>();
      const collectIds = (f: DriveFolder) => {
        ids.add(f.id);
        f.files.forEach(file => ids.add(file.id));
        f.folders.forEach(collectIds);
      };
      collectIds(data);
      setSelectedIds(ids);

      setStep("preview");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Please check your configuration and permissions.";
      toast.error("Failed to connect to Google Drive", {
        description: message
      });
    } finally {
      setLoading(false);
    }
  }

  function extractFolderId(link: string) {
    const match = link.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  }

  function toggleSelection(id: string, isFolder: boolean) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      if (isFolder && driveData) {
        // Deselect children
        const deselectChildren = (fid: string) => {
          const findAndDeselect = (current: DriveFolder) => {
            if (current.id === fid) {
              current.files.forEach(f => next.delete(f.id));
              current.folders.forEach(f => {
                next.delete(f.id);
                deselectChildren(f.id);
              });
            } else {
              current.folders.forEach(findAndDeselect);
            }
          };
          findAndDeselect(driveData);
        };
        deselectChildren(id);
      }
    } else {
      next.add(id);
      // Select parents would be nice but more complex.
      // Let's just select children for now.
      if (isFolder && driveData) {
        const selectChildren = (fid: string) => {
          const findAndSelect = (current: DriveFolder) => {
            if (current.id === fid) {
              current.files.forEach(f => next.add(f.id));
              current.folders.forEach(f => {
                next.add(f.id);
                selectChildren(f.id);
              });
            } else {
              current.folders.forEach(findAndSelect);
            }
          };
          findAndSelect(driveData);
        };
        selectChildren(id);
      }
    }
    setSelectedIds(next);
  }

  async function handleImport() {
    if (!driveData) return;
    setStep("importing");

    const importRecursive = (folder: DriveFolder, parentId?: string) => {
      let atlasFolderId = parentId;

      const shouldImportFolder = selectedIds.has(folder.id);
      const hasSelectedChildren = folder.files.some(f => selectedIds.has(f.id)) ||
                                folder.folders.some(f => hasSelectedRecursive(f));

      if (shouldImportFolder || hasSelectedChildren) {
        atlasFolderId = addFolder(folder.name, "blue", parentId);

        folder.files.forEach(file => {
          if (selectedIds.has(file.id)) {
            addLink(atlasFolderId!, file.name, file.webViewLink);
          }
        });

        folder.folders.forEach(sub => importRecursive(sub, atlasFolderId));
      }
    };

    const hasSelectedRecursive = (folder: DriveFolder): boolean => {
      if (selectedIds.has(folder.id)) return true;
      if (folder.files.some(f => selectedIds.has(f.id))) return true;
      return folder.folders.some(f => hasSelectedRecursive(f));
    };

    importRecursive(driveData);
    setStep("success");
    toast.success("Import complete!");
  }

  const FolderTree = ({ folder, level = 0 }: { folder: DriveFolder, level?: number }) => (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors",
          !selectedIds.has(folder.id) && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => toggleSelection(folder.id, true)}
      >
        <FolderIcon className="size-4 text-blue-500" />
        <span className="flex-1 truncate">{folder.name}</span>
        <div className={cn("size-4 rounded border flex items-center justify-center", selectedIds.has(folder.id) ? "bg-blue-500 border-blue-500" : "border-muted-foreground")}>
          {selectedIds.has(folder.id) && <div className="size-2 bg-white rounded-full" />}
        </div>
      </div>
      {folder.files.map(file => (
        <div
          key={file.id}
          className={cn(
            "flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors",
            !selectedIds.has(file.id) && "opacity-50"
          )}
          style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
          onClick={() => toggleSelection(file.id, false)}
        >
          <FileIcon className="size-4 text-muted-foreground" />
          <span className="flex-1 truncate text-xs">{file.name}</span>
          <div className={cn("size-3.5 rounded border flex items-center justify-center", selectedIds.has(file.id) ? "bg-blue-500 border-blue-500" : "border-muted-foreground")}>
            {selectedIds.has(file.id) && <div className="size-1.5 bg-white rounded-full" />}
          </div>
        </div>
      ))}
      {folder.folders.map(sub => (
        <FolderTree key={sub.id} folder={sub} level={level + 1} />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) setTimeout(() => {
        setStep("link");
        setDriveData(null);
      }, 300);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from Google Drive</DialogTitle>
          <DialogDescription>
            {step === "link" && "Paste a link to a Google Drive folder to import its contents."}
            {step === "preview" && "Select the files and folders you want to import."}
            {step === "importing" && "Creating folders and links in Atlas..."}
            {step === "success" && "Your Google Drive files have been imported."}
          </DialogDescription>
        </DialogHeader>

        {step === "link" && (
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-link">Folder Link</Label>
              <Input
                id="folder-link"
                placeholder="https://drive.google.com/drive/folders/..."
                value={folderLink}
                onChange={(e) => setFolderLink(e.target.value)}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground flex gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
            <p>You&apos;ll need to sign in to Google to allow Atlas to read the folder contents.</p>
            </div>
          </div>
        )}

        {step === "preview" && driveData && (
          <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2 my-2 atlas-scroll">
            <FolderTree folder={driveData} />
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2Icon className="size-10 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Syncing files...</p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <CheckCircle2Icon className="size-12 text-emerald-500" />
            <div>
              <h3 className="font-semibold">Import successful</h3>
              <p className="text-sm text-muted-foreground">You can now find your files in the Atlas dashboard.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "link" && (
            <Button
              className="w-full"
              onClick={handleConnect}
              disabled={loading || !folderLink}
            >
              {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              Connect to Drive
            </Button>
          )}
          {step === "preview" && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setStep("link")}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleImport} disabled={selectedIds.size === 0}>
                Import ({selectedIds.size})
              </Button>
            </div>
          )}
          {step === "success" && (
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
