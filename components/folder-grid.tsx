"use client";

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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { FolderCard } from "@/components/folder-card";
import { useAtlasStore } from "@/lib/store";
import type { Link } from "@/lib/types";

export function FolderGrid() {
  const folders = useAtlasStore((s) => s.folders);
  const linksMap = useAtlasStore((s) => s.links);
  const reorderFolders = useAtlasStore((s) => s.reorderFolders);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = folders.map((f) => f.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderFolders(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={folders.map((f) => f.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => {
            const links = folder.linkIds
              .map((id) => linksMap[id])
              .filter((l): l is Link => Boolean(l));
            return (
              <FolderCard key={folder.id} folder={folder} links={links} />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
