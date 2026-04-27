"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { SortableCard }           from "@/components/card/SortableCard";
import { AddCardForm }            from "@/components/card/AddCardForm";
import { EditableColumnTitle }    from "./EditableColumnTitle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import type { DndCard, DndColumn, ColumnDropData } from "@/types/dnd";

interface ColumnProps {
  column: DndColumn;
  boardId: string;
  canEdit: boolean;
  onCardAdded:      (card: DndCard) => void;
  onCardClick:      (cardId: string) => void;
  onColumnRenamed:  (columnId: string, newTitle: string) => Promise<boolean>;
  onColumnDeleted:  (column: DndColumn) => Promise<boolean>;
  dragHandleListeners?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export function Column({
  column, boardId, canEdit,
  onCardAdded, onCardClick,
  onColumnRenamed, onColumnDeleted,
  dragHandleListeners, isDragging,
}: ColumnProps) {
  const [addingCard,        setAddingCard]        = useState(false);
  const [isEditingTitle,    setIsEditingTitle]    = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting,        setIsDeleting]        = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column-drop", columnId: column.id } satisfies ColumnDropData,
  });

  const cardIds = column.cards.map((c) => c.id);

  // ── Callbacks ──────────────────────────────────────────────────────────────

  async function handleTitleCommit(newTitle: string): Promise<boolean> {
    return onColumnRenamed(column.id, newTitle);
  }

  async function handleConfirmDelete() {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    const success = await onColumnDeleted(column);
    // If success, BoardClient removes this column → component unmounts (no cleanup needed).
    // If failed, restore normal state so the user can try again.
    if (!success) setIsDeleting(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className={[
          "relative w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-100 shadow-sm",
          "max-h-[calc(100vh-10rem)] transition-opacity",
          isDragging ? "opacity-40" : "opacity-100",
        ].join(" ")}
      >
        {/* ── Deleting overlay ──────────────────────────────────────────────── */}
        {isDeleting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-200/80 backdrop-blur-[2px]">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <span className="text-sm font-medium text-slate-600">Deleting…</span>
          </div>
        )}

        {/* ── Column header ─────────────────────────────────────────────────── */}
        <div
          {...dragHandleListeners}
          className="flex items-center gap-1.5 px-2 py-2 flex-shrink-0 cursor-grab active:cursor-grabbing rounded-t-xl"
        >
          {/* Grip */}
          <GripVertical className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />

          {/* Title — flex-1 so it fills the space between grip and count/menu */}
          <div className="flex-1 min-w-0">
            <EditableColumnTitle
              title={column.title}
              isEditing={isEditingTitle}
              onEditingChange={setIsEditingTitle}
              onCommit={handleTitleCommit}
              canEdit={canEdit}
            />
          </div>

          {/* Card count */}
          <span className="flex-shrink-0 text-[11px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">
            {column.cards.length}
          </span>

          {/* Actions dropdown — EDITOR+ only */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger
                onPointerDown={(e) => e.stopPropagation()}
                className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors focus:outline-none"
                aria-label="Column actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                <DropdownMenuItem
                  onClick={() => setIsEditingTitle(true)}
                  className="gap-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Cards list ────────────────────────────────────────────────────── */}
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={[
              "flex-1 overflow-y-auto px-2 pb-2 min-h-[120px] rounded-lg transition-colors",
              isOver ? "bg-blue-50/50" : "",
            ].join(" ")}
          >
            <div className="space-y-2">
              {column.cards.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  canDrag={canEdit}
                  onCardClick={onCardClick}
                />
              ))}

              {addingCard && (
                <AddCardForm
                  columnId={column.id}
                  boardId={boardId}
                  onClose={() => setAddingCard(false)}
                  onCardAdded={(card) => { onCardAdded(card); setAddingCard(false); }}
                />
              )}
            </div>

            {column.cards.length === 0 && !addingCard && (
              <div
                className={[
                  "mt-1 flex items-center justify-center rounded-lg border-2 border-dashed py-8 transition-colors pointer-events-none select-none",
                  isOver ? "border-blue-300 bg-blue-50/40" : "border-slate-200",
                ].join(" ")}
              >
                <span className="text-xs text-slate-400">Drop cards here</span>
              </div>
            )}
          </div>
        </SortableContext>

        {/* ── Add card footer ───────────────────────────────────────────────── */}
        {canEdit && !addingCard && (
          <div className="px-2 pb-2 flex-shrink-0">
            <button
              onClick={() => setAddingCard(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add a card
            </button>
          </div>
        )}
      </div>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="h-5 w-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete &ldquo;{column.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this column and{" "}
              <strong>
                {column.cards.length === 0
                  ? "all cards inside it"
                  : `${column.cards.length} card${column.cards.length !== 1 ? "s" : ""} inside it`}
              </strong>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              variant="destructive"
            >
              Delete Column
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
