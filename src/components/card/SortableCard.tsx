"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardItem } from "./CardItem";
import type { DndCard, CardDragData } from "@/types/dnd";

interface SortableCardProps {
  card: DndCard;
  canDrag: boolean;
  onCardClick: (cardId: string) => void;
}

export function SortableCard({ card, canDrag, onCardClick }: SortableCardProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", card } satisfies CardDragData,
    disabled: !canDrag,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Prevents the browser from claiming the touch for scrolling or pull-to-refresh
    // before the TouchSensor's 250ms long-press window has elapsed.
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative">
      {/* Render CardItem invisible when dragging so the placeholder takes its exact dimensions */}
      <div className={isDragging ? "invisible" : undefined}>
        <CardItem card={card} onClick={isDragging ? undefined : () => onCardClick(card.id)} />
      </div>

      {/* Ghost placeholder — visible only while this card is the active drag item */}
      {isDragging && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-lg border-2 border-dashed border-slate-300 bg-slate-200/50 transition-opacity"
        />
      )}
    </div>
  );
}
