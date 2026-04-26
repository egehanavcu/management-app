"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { SortableColumn } from "@/components/column/SortableColumn";
import { ColumnOverlay } from "@/components/column/ColumnOverlay";
import { AddColumnButton } from "@/components/column/AddColumnButton";
import { CardOverlay } from "@/components/card/CardOverlay";
import { calculateNewPosition } from "@/lib/position";
import type {
  DndCard,
  DndColumn,
  DndBoardMember,
  CardDragData,
  ColumnDragData,
  ColumnDropData,
} from "@/types/dnd";
import type { Role } from "@/generated/prisma";

interface BoardClientProps {
  boardId: string;
  boardTitle: string;
  members: DndBoardMember[];
  initialColumns: DndColumn[];
  userRole: Role;
}

function MemberAvatar({ name, email }: { name: string | null; email: string | null }) {
  const label = name ?? email ?? "?";
  const initials = label.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      title={label}
      className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-semibold border-2 border-white -ml-1.5 first:ml-0"
    >
      {initials}
    </div>
  );
}

/** Returns the column containing `cardId`, or undefined. */
function findCardColumn(cardId: string, cols: DndColumn[]): DndColumn | undefined {
  return cols.find((c) => c.cards.some((card) => card.id === cardId));
}

export function BoardClient({
  boardId,
  boardTitle,
  members,
  initialColumns,
  userRole,
}: BoardClientProps) {
  const [columns, setColumns] = useState<DndColumn[]>(initialColumns);
  const [activeCard, setActiveCard] = useState<DndCard | null>(null);
  const [activeColumn, setActiveColumn] = useState<DndColumn | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Snapshot taken at drag-start — the rollback target on API failure
  const preDragSnapshot = useRef<DndColumn[]>(initialColumns);

  const canEdit = userRole === "OWNER" || userRole === "EDITOR";

  // ─── Child callbacks ──────────────────────────────────────────────────────

  const handleCardAdded = useCallback((card: DndCard) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === card.columnId ? { ...col, cards: [...col.cards, card] } : col
      )
    );
  }, []);

  const handleColumnAdded = useCallback((column: DndColumn) => {
    setColumns((prev) => [...prev, column]);
  }, []);

  // ─── Sensors ─────────────────────────────────────────────────────────────
  // PointerSensor: 8 px of movement required — prevents misfire on clicks.
  // TouchSensor:   200 ms long-press — safe on mobile without blocking scroll.
  // KeyboardSensor: accessibility.

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─── Drag start ───────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      preDragSnapshot.current = columns;
      const data = active.data.current as CardDragData | ColumnDragData | undefined;
      if (data?.type === "card") {
        setActiveCard(data.card);
        setActiveColumn(null);
      } else if (data?.type === "column") {
        setActiveColumn(data.column);
        setActiveCard(null);
      }
    },
    [columns]
  );

  // ─── Drag over ────────────────────────────────────────────────────────────

  const handleDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;

    const activeType = (active.data.current as CardDragData | ColumnDragData | undefined)?.type;

    // ── Column reorder ───────────────────────────────────────────────────────
    if (activeType === "column") {
      setColumns((prev) => {
        const oldIdx = prev.findIndex((c) => c.id === active.id);
        const newIdx = prev.findIndex((c) => c.id === over.id);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
      return;
    }

    // ── Card move ────────────────────────────────────────────────────────────
    if (activeType !== "card") return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const overData = over.data.current as CardDragData | ColumnDropData | undefined;

    const targetColId =
      overData?.type === "column-drop"
        ? overData.columnId
        : overData?.type === "card"
        ? overData.card.columnId
        : null;

    if (!targetColId) return;

    setColumns((prev) => {
      const sourceCol = findCardColumn(activeId, prev);
      if (!sourceCol) return prev;

      const targetCol = prev.find((c) => c.id === targetColId);
      if (!targetCol) return prev;

      // Same-column reorder
      if (sourceCol.id === targetColId) {
        const oldIdx = sourceCol.cards.findIndex((c) => c.id === activeId);
        const newIdx = targetCol.cards.findIndex((c) => c.id === overId);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        return prev.map((col) =>
          col.id === targetColId
            ? { ...col, cards: arrayMove(col.cards, oldIdx, newIdx) }
            : col
        );
      }

      // Cross-column move
      const movedCard = sourceCol.cards.find((c) => c.id === activeId);
      if (!movedCard) return prev;

      let insertAt =
        overData?.type === "card"
          ? targetCol.cards.findIndex((c) => c.id === overId)
          : targetCol.cards.length;
      if (insertAt < 0) insertAt = targetCol.cards.length;

      return prev.map((col) => {
        if (col.id === sourceCol.id)
          return { ...col, cards: col.cards.filter((c) => c.id !== activeId) };
        if (col.id === targetColId) {
          const next = [...col.cards];
          next.splice(insertAt, 0, { ...movedCard, columnId: targetColId });
          return { ...col, cards: next };
        }
        return col;
      });
    });
  }, []);

  // ─── Drag end ────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const snapshot = preDragSnapshot.current;
      const activeType = (active.data.current as CardDragData | ColumnDragData | undefined)?.type;
      const activeId = String(active.id);

      setActiveCard(null);
      setActiveColumn(null);

      if (!over) {
        setColumns(snapshot);
        return;
      }

      // ── Column drag end ──────────────────────────────────────────────────
      if (activeType === "column") {
        const finalIdx = columns.findIndex((c) => c.id === activeId);
        if (finalIdx === -1) { setColumns(snapshot); return; }

        // Fractional position: siblings are all columns except the active one
        const siblings = columns.filter((c) => c.id !== activeId);
        const newPosition = calculateNewPosition(siblings, finalIdx);

        setColumns((prev) =>
          prev.map((col) =>
            col.id === activeId ? { ...col, position: newPosition } : col
          )
        );

        setSyncing(true);
        fetch(`/api/columns/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: newPosition }),
        })
          .then((res) => { if (!res.ok) throw new Error(`${res.status}`); })
          .catch(() => {
            setColumns(snapshot);
            toast.error("Couldn't save column position — changes reverted.");
          })
          .finally(() => setSyncing(false));

        return;
      }

      // ── Card drag end ────────────────────────────────────────────────────
      if (activeType !== "card") return;

      const finalCol = findCardColumn(activeId, columns);
      if (!finalCol) { setColumns(snapshot); return; }

      const finalIndex = finalCol.cards.findIndex((c) => c.id === activeId);
      if (finalIndex === -1) { setColumns(snapshot); return; }

      // Fractional position: siblings = other cards in the destination column
      const siblings = finalCol.cards.filter((c) => c.id !== activeId);
      const newPosition = calculateNewPosition(siblings, finalIndex);

      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card.id === activeId
              ? { ...card, position: newPosition, columnId: finalCol.id }
              : card
          ),
        }))
      );

      setSyncing(true);
      fetch(`/api/cards/${activeId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newColumnId: finalCol.id, newPosition }),
      })
        .then((res) => { if (!res.ok) throw new Error(`${res.status}`); })
        .catch(() => {
          setColumns(snapshot);
          toast.error("Couldn't save card position — changes reverted.");
        })
        .finally(() => setSyncing(false));
    },
    [columns]
  );

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
    setActiveColumn(null);
    setColumns(preDragSnapshot.current);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  const columnIds = columns.map((c) => c.id);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Board header */}
      <div className="flex items-center gap-4 px-5 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <h1 className="text-lg font-bold text-white truncate">{boardTitle}</h1>
        {syncing && (
          <span className="ml-1 text-[11px] font-medium text-white/60 animate-pulse">
            Syncing…
          </span>
        )}
        <div className="flex items-center ml-auto flex-shrink-0 gap-3">
          <div className="flex items-center">
            {members.map((m) => (
              <MemberAvatar key={m.id} name={m.user.name} email={m.user.email} />
            ))}
          </div>
          <span className="flex items-center gap-1 text-xs text-white/70">
            <Users className="h-3.5 w-3.5" />
            {members.length}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white/20 text-white">
            {userRole.toLowerCase()}
          </span>
        </div>
      </div>

      {/* DnD context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-4 h-full items-start min-w-max">
            {/* Horizontal SortableContext owns the column order */}
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              {columns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  boardId={boardId}
                  canEdit={canEdit}
                  onCardAdded={handleCardAdded}
                />
              ))}
            </SortableContext>
            {canEdit && (
              <AddColumnButton boardId={boardId} onColumnAdded={handleColumnAdded} />
            )}
          </div>
        </div>

        {/* DragOverlay — shows the "lifted" preview for whichever item is active */}
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeCard && <CardOverlay card={activeCard} />}
          {activeColumn && <ColumnOverlay column={activeColumn} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
