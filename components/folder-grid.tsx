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
import { useShallow } from "zustand/react/shallow";
import { FolderCard } from "@/components/folder-card";
import { useAtlasStore } from "@/lib/store";

export function FolderGrid() {
  const folderIds = useAtlasStore(
    useShallow((s) => s.folders.map((f) => f.id)),
  );
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
    const oldIndex = folderIds.indexOf(String(active.id));
    const newIndex = folderIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderFolders(arrayMove(folderIds, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={folderIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folderIds.map((id) => (
            <FolderCard key={id} folderId={id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
