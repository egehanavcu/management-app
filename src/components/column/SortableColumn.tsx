"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Column } from "./Column";
import type { DndCard, DndColumn, ColumnDragData } from "@/types/dnd";

interface SortableColumnProps {
  column: DndColumn;
  boardId: string;
  canEdit: boolean;
  onCardAdded: (card: DndCard) => void;
}

export function SortableColumn({ column, boardId, canEdit, onCardAdded }: SortableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column", column } satisfies ColumnDragData,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Keep the ghost slot visible at reduced opacity while dragging;
    // the DragOverlay shows the "lifted" version.
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    // setNodeRef + attributes on the outer wrapper; listeners go to the
    // header only (passed as dragHandleListeners) so clicking cards doesn't
    // start a column drag.
    <div ref={setNodeRef} style={style} {...attributes}>
      <Column
        column={column}
        boardId={boardId}
        canEdit={canEdit}
        onCardAdded={onCardAdded}
        dragHandleListeners={listeners as React.HTMLAttributes<HTMLDivElement>}
        isDragging={isDragging}
      />
    </div>
  );
}
