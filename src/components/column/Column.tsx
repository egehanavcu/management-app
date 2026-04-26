"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal } from "lucide-react";
import { SortableCard } from "@/components/card/SortableCard";
import { AddCardForm } from "@/components/card/AddCardForm";
import { Button } from "@/components/ui/button";
import type { DndColumn } from "@/types/dnd";

interface ColumnProps {
  column: DndColumn;
  boardId: string;
  canEdit: boolean;
}

export function Column({ column, boardId, canEdit }: ColumnProps) {
  const [addingCard, setAddingCard] = useState(false);

  // Make the cards area a drop target so empty columns accept drops
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const cardIds = column.cards.map((c) => c.id);

  return (
    <div className="w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-100 shadow-sm max-h-[calc(100vh-10rem)]">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 truncate">{column.title}</h3>
          <span className="flex-shrink-0 text-[11px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">
            {column.cards.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards list — the droppable area */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 overflow-y-auto px-2 space-y-2 pb-2 min-h-[2rem] rounded-lg transition-colors ${
            isOver ? "bg-blue-50/60" : ""
          }`}
        >
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}

          {addingCard && (
            <AddCardForm
              columnId={column.id}
              boardId={boardId}
              onClose={() => setAddingCard(false)}
            />
          )}
        </div>
      </SortableContext>

      {/* Add card footer */}
      {canEdit && !addingCard && (
        <div className="px-2 pb-2 flex-shrink-0">
          <button
            onClick={() => setAddingCard(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add a card
          </button>
        </div>
      )}
    </div>
  );
}
