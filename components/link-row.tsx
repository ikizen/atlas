"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVerticalIcon,
  PencilIcon,
  PinIcon,
  Trash2Icon,
} from "lucide-react";
import { LinkFavicon } from "@/components/link-favicon";
import { Button } from "@/components/ui/button";
import type { Link } from "@/lib/types";
import { hostnameOf } from "@/lib/url";
import { cn } from "@/lib/utils";

export const LinkRow = memo(function LinkRow({
  link,
  onOpen,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  link: Link;
  onOpen: () => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group/link flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60",
        isDragging && "z-10 bg-muted opacity-80 shadow-sm",
      )}
    >
      <button
        type="button"
        aria-label="Reorder link"
        className="-ml-1 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover/link:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <LinkFavicon url={link.url} title={link.title} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{link.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {hostnameOf(link.url).replace(/^www\./, "")}
          </span>
        </span>
      </button>

      <div
        className={cn(
          "flex items-center opacity-0 transition-opacity group-hover/link:opacity-100 has-[:focus-visible]:opacity-100",
          link.pinned && "opacity-100",
        )}
      >
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onTogglePin}
          aria-label={link.pinned ? "Unpin link" : "Pin link"}
          title={link.pinned ? "Unpin" : "Pin"}
        >
          <PinIcon
            className={cn(
              "size-3.5",
              link.pinned && "fill-foreground text-foreground",
            )}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onEdit}
          aria-label="Edit link"
        >
          <PencilIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDelete}
          aria-label="Delete link"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
});
