"use client";

import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExternalLinkIcon,
  GripVerticalIcon,
  MoreVerticalIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { LinkRow } from "@/components/link-row";
import { LinkDialog, type LinkDraft } from "@/components/link-dialog";
import { FolderDialog, type FolderDraft } from "@/components/folder-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAtlasStore } from "@/lib/store";
import { useOpen } from "@/hooks/use-open";
import { accentColor } from "@/lib/accents";
import type { Link } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FolderCard({ folderId }: { folderId: string }) {
  const folder = useAtlasStore(
    (s) => s.folders.find((f) => f.id === folderId),
  );
  const links = useAtlasStore(
    useShallow((s) =>
      folder?.linkIds.map((id) => s.links[id]).filter((l): l is Link => !!l) ??
      [],
    ),
  );

  const addLink = useAtlasStore((s) => s.addLink);
  const editLink = useAtlasStore((s) => s.editLink);
  const deleteLink = useAtlasStore((s) => s.deleteLink);
  const reorderLinks = useAtlasStore((s) => s.reorderLinks);
  const togglePin = useAtlasStore((s) => s.togglePin);
  const renameFolder = useAtlasStore((s) => s.renameFolder);
  const setFolderAccent = useAtlasStore((s) => s.setFolderAccent);
  const deleteFolder = useAtlasStore((s) => s.deleteFolder);
  const { openLink, openFolder } = useOpen();

  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    id?: string;
    initial?: LinkDraft;
  }>({ open: false, mode: "create" });
  const [folderEditOpen, setFolderEditOpen] = useState(false);
  const [confirmFolder, setConfirmFolder] = useState(false);
  const [confirmLink, setConfirmLink] = useState<{
    open: boolean;
    id?: string;
    title?: string;
  }>({ open: false });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folderId });

  const accent = useMemo(
    () => (folder ? accentColor(folder.accent) : ""),
    [folder],
  );

  const handleLinkDragEnd = useCallback(
    (e: DragEndEvent) => {
      if (!folder) return;
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const ids = links.map((l) => l.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      reorderLinks(folder.id, arrayMove(ids, oldIndex, newIndex));
    },
    [folder, links, reorderLinks],
  );

  if (!folder) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ["--accent" as string]: accent,
      }}
      className={cn(
        "flex flex-col rounded-xl border bg-card/40 ring-1 ring-transparent transition-shadow",
        isDragging && "z-10 opacity-80 shadow-lg ring-border",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-label="Reorder folder"
          className="-ml-1 cursor-grab text-muted-foreground/30 transition-colors hover:text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: "var(--accent)" }}
        />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          {folder.name}
        </h2>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {links.length}
        </span>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => openFolder(links)}
          disabled={links.length === 0}
          aria-label="Open all links"
          title="Open all"
        >
          <ExternalLinkIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() =>
            setLinkDialog({ open: true, mode: "create" })
          }
          aria-label="Add link"
          title="Add link"
        >
          <PlusIcon className="size-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Folder menu"
              />
            }
          >
            <MoreVerticalIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFolderEditOpen(true)}>
              <PencilIcon /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFolderEditOpen(true)}>
              <PaletteIcon /> Change accent
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmFolder(true)}
            >
              <Trash2Icon /> Delete folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="mx-3 h-px"
        style={{
          background:
            "linear-gradient(to right, color-mix(in oklch, var(--accent) 40%, transparent), transparent)",
        }}
      />

      <div className="atlas-scroll flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-2">
        {links.length === 0 ? (
          <button
            type="button"
            onClick={() => setLinkDialog({ open: true, mode: "create" })}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-6 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <PlusIcon className="size-3.5" /> Add your first link
          </button>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleLinkDragEnd}
          >
            <SortableContext
              items={links.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {links.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  onOpen={() => openLink(link)}
                  onTogglePin={() => togglePin(link.id)}
                  onEdit={() =>
                    setLinkDialog({
                      open: true,
                      mode: "edit",
                      id: link.id,
                      initial: { title: link.title, url: link.url },
                    })
                  }
                  onDelete={() =>
                    setConfirmLink({
                      open: true,
                      id: link.id,
                      title: link.title,
                    })
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <LinkDialog
        open={linkDialog.open}
        onOpenChange={(o) => setLinkDialog((d) => ({ ...d, open: o }))}
        mode={linkDialog.mode}
        initial={linkDialog.initial}
        onSubmit={(draft) => {
          if (linkDialog.mode === "create") {
            addLink(folder.id, draft.title, draft.url);
          } else if (linkDialog.id) {
            editLink(linkDialog.id, draft.title, draft.url);
          }
        }}
      />

      <FolderDialog
        open={folderEditOpen}
        onOpenChange={setFolderEditOpen}
        mode="edit"
        initial={{ name: folder.name, accent: folder.accent }}
        onSubmit={(draft: FolderDraft) => {
          renameFolder(folder.id, draft.name);
          setFolderAccent(folder.id, draft.accent);
        }}
      />

      <ConfirmDialog
        open={confirmFolder}
        onOpenChange={setConfirmFolder}
        title={`Delete "${folder.name}"?`}
        description="This removes the folder and all of its links. This cannot be undone."
        confirmLabel="Delete folder"
        onConfirm={() => deleteFolder(folder.id)}
      />

      <ConfirmDialog
        open={confirmLink.open}
        onOpenChange={(o) => setConfirmLink((c) => ({ ...c, open: o }))}
        title="Delete link?"
        description={`"${confirmLink.title ?? ""}" will be removed.`}
        confirmLabel="Delete link"
        onConfirm={() => confirmLink.id && deleteLink(confirmLink.id)}
      />
    </div>
  );
}
