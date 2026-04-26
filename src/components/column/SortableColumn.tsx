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
  onCardClick: (cardId: string) => void;
}

export function SortableColumn({ column, boardId, canEdit, onCardAdded, onCardClick }: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column", column } satisfies ColumnDragData,
    disabled: !canEdit,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Column
        column={column}
        boardId={boardId}
        canEdit={canEdit}
        onCardAdded={onCardAdded}
        onCardClick={onCardClick}
        dragHandleListeners={listeners as React.HTMLAttributes<HTMLDivElement>}
        isDragging={isDragging}
      />
    </div>
  );
}
