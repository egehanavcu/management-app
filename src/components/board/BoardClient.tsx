"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Users, Activity, UserPlus } from "lucide-react";
import { SortableColumn }        from "@/components/column/SortableColumn";
import { ColumnOverlay }         from "@/components/column/ColumnOverlay";
import { AddColumnButton }       from "@/components/column/AddColumnButton";
import { CardOverlay }           from "@/components/card/CardOverlay";
import { CardModal }             from "@/components/card/CardModal";
import { MembersDialog }         from "./MembersDialog";
import { BoardActivityPanel }    from "./BoardActivityPanel";
import { EditableBoardTitle }    from "./EditableBoardTitle";
import { Button }                from "@/components/ui/button";
import { calculateNewPosition }  from "@/lib/position";
import type { DndCard, DndColumn, DndBoardMember, BoardLabel, CardDragData, ColumnDragData, ColumnDropData } from "@/types/dnd";
import type { Role } from "@/generated/prisma";

interface BoardClientProps {
  boardId: string;
  boardTitle: string;
  members: DndBoardMember[];
  labels: BoardLabel[];
  initialColumns: DndColumn[];
  userRole: Role;
}

function MemberAvatar({ name, email }: { name: string | null; email: string | null }) {
  const label = name ?? email ?? "?";
  const initials = label.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div title={label} className="w-7 h-7 rounded-full bg-white/30 text-white flex items-center justify-center text-[11px] font-semibold border-2 border-white/40 -ml-1.5 first:ml-0">
      {initials}
    </div>
  );
}

function findCardColumn(cardId: string, cols: DndColumn[]) {
  return cols.find((c) => c.cards.some((card) => card.id === cardId));
}

export function BoardClient({ boardId, boardTitle, members: initialMembers, labels, initialColumns, userRole }: BoardClientProps) {
  const [columns,          setColumns]         = useState<DndColumn[]>(initialColumns);
  const [members,          setMembers]         = useState<DndBoardMember[]>(initialMembers);
  const [activeCard,       setActiveCard]      = useState<DndCard | null>(null);
  const [activeColumn,     setActiveColumn]    = useState<DndColumn | null>(null);
  const [selectedCardId,   setSelectedCardId]  = useState<string | null>(null);
  const [showMembers,      setShowMembers]     = useState(false);
  const [showActivity,     setShowActivity]    = useState(false);
  const [syncing,          setSyncing]         = useState(false);
  const preDragSnapshot = useRef<DndColumn[]>(initialColumns);

  const canEdit   = userRole === "OWNER" || userRole === "EDITOR";
  const isOwner   = userRole === "OWNER";
  const columnIds = columns.map((c) => c.id);

  // Current session user ID — find from members list
  // (the current user IS in the members list, we can identify by role match; use a safer approach)
  // We'll expose it through the page. For now derive from the OWNER member if isOwner, else rely on API.
  const currentUserId = members.find((m) => m.role === userRole)?.userId ?? "";

  // ─── Child callbacks ──────────────────────────────────────────────────────
  const handleCardAdded = useCallback((card: DndCard) => {
    setColumns((prev) => prev.map((col) => col.id === card.columnId ? { ...col, cards: [...col.cards, card] } : col));
  }, []);

  const handleColumnAdded = useCallback((column: DndColumn) => {
    setColumns((prev) => [...prev, column]);
  }, []);

  const handleCardUpdated = useCallback((updated: DndCard) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === updated.id ? updated : c)),
      }))
    );
  }, []);

  const handleCardClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  // ─── Derive selected card ─────────────────────────────────────────────────
  const selectedCard = selectedCardId
    ? columns.flatMap((c) => c.cards).find((c) => c.id === selectedCardId) ?? null
    : null;
  const selectedCardColumn = selectedCardId
    ? columns.find((col) => col.cards.some((c) => c.id === selectedCardId)) ?? null
    : null;

  // ─── Sensors ─────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─── Drag start ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    preDragSnapshot.current = columns;
    const data = active.data.current as CardDragData | ColumnDragData | undefined;
    if (data?.type === "card")   { setActiveCard(data.card);     setActiveColumn(null); }
    if (data?.type === "column") { setActiveColumn(data.column); setActiveCard(null); }
  }, [columns]);

  // ─── Drag over ────────────────────────────────────────────────────────────
  const handleDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;
    const activeType = (active.data.current as CardDragData | ColumnDragData | undefined)?.type;

    if (activeType === "column") {
      setColumns((prev) => {
        const oi = prev.findIndex((c) => c.id === active.id);
        const ni = prev.findIndex((c) => c.id === over.id);
        if (oi === -1 || ni === -1 || oi === ni) return prev;
        return arrayMove(prev, oi, ni);
      });
      return;
    }
    if (activeType !== "card") return;

    const activeId = String(active.id);
    const overId   = String(over.id);
    const overData = over.data.current as CardDragData | ColumnDropData | undefined;
    const targetColId =
      overData?.type === "column-drop" ? overData.columnId :
      overData?.type === "card" ? overData.card.columnId : null;
    if (!targetColId) return;

    setColumns((prev) => {
      const sourceCol = findCardColumn(activeId, prev);
      if (!sourceCol) return prev;
      const targetCol = prev.find((c) => c.id === targetColId);
      if (!targetCol) return prev;

      if (sourceCol.id === targetColId) {
        const oi = sourceCol.cards.findIndex((c) => c.id === activeId);
        const ni = targetCol.cards.findIndex((c) => c.id === overId);
        if (oi === -1 || ni === -1 || oi === ni) return prev;
        return prev.map((col) => col.id === targetColId ? { ...col, cards: arrayMove(col.cards, oi, ni) } : col);
      }

      const movedCard = sourceCol.cards.find((c) => c.id === activeId);
      if (!movedCard) return prev;
      let insertAt = overData?.type === "card" ? targetCol.cards.findIndex((c) => c.id === overId) : targetCol.cards.length;
      if (insertAt < 0) insertAt = targetCol.cards.length;
      return prev.map((col) => {
        if (col.id === sourceCol.id) return { ...col, cards: col.cards.filter((c) => c.id !== activeId) };
        if (col.id === targetColId) { const next = [...col.cards]; next.splice(insertAt, 0, { ...movedCard, columnId: targetColId }); return { ...col, cards: next }; }
        return col;
      });
    });
  }, []);

  // ─── Drag end ────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    const snapshot = preDragSnapshot.current;
    const activeType = (active.data.current as CardDragData | ColumnDragData | undefined)?.type;
    const activeId   = String(active.id);
    setActiveCard(null);
    setActiveColumn(null);

    if (!over) { setColumns(snapshot); return; }

    if (activeType === "column") {
      const idx = columns.findIndex((c) => c.id === activeId);
      if (idx === -1) { setColumns(snapshot); return; }
      const siblings    = columns.filter((c) => c.id !== activeId);
      const newPosition = calculateNewPosition(siblings, idx);
      setColumns((prev) => prev.map((c) => c.id === activeId ? { ...c, position: newPosition } : c));
      setSyncing(true);
      fetch(`/api/columns/${activeId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: newPosition }),
      })
        .then((r) => { if (!r.ok) throw new Error(); })
        .catch(() => { setColumns(snapshot); toast.error("Couldn't save column position — changes reverted."); })
        .finally(() => setSyncing(false));
      return;
    }

    if (activeType !== "card") return;
    const finalCol = findCardColumn(activeId, columns);
    if (!finalCol) { setColumns(snapshot); return; }
    const finalIdx = finalCol.cards.findIndex((c) => c.id === activeId);
    if (finalIdx === -1) { setColumns(snapshot); return; }
    const siblings    = finalCol.cards.filter((c) => c.id !== activeId);
    const newPosition = calculateNewPosition(siblings, finalIdx);
    setColumns((prev) => prev.map((col) => ({
      ...col,
      cards: col.cards.map((c) => c.id === activeId ? { ...c, position: newPosition, columnId: finalCol.id } : c),
    })));
    setSyncing(true);
    fetch(`/api/cards/${activeId}/move`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newColumnId: finalCol.id, newPosition }),
    })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => { setColumns(snapshot); toast.error("Couldn't save card position — changes reverted."); })
      .finally(() => setSyncing(false));
  }, [columns]);

  const handleDragCancel = useCallback(() => {
    setActiveCard(null); setActiveColumn(null); setColumns(preDragSnapshot.current);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Board header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <EditableBoardTitle boardId={boardId} initialTitle={boardTitle} canEdit={canEdit} />
        {syncing && <span className="ml-1 text-[11px] text-white/60 animate-pulse flex-shrink-0">Syncing…</span>}

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Member avatars */}
          <div className="flex items-center">{members.slice(0, 6).map((m) => <MemberAvatar key={m.id} name={m.user.name} email={m.user.email} />)}</div>

          {/* Members button */}
          <Button
            size="sm" variant="ghost"
            onClick={() => setShowMembers(true)}
            className="text-white/80 hover:text-white hover:bg-white/20 gap-1.5 h-8 px-2.5"
          >
            {isOwner ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            <span className="text-xs font-medium">{members.length}</span>
          </Button>

          {/* Activity toggle */}
          <Button
            size="sm" variant="ghost"
            onClick={() => setShowActivity((v) => !v)}
            className={`text-white/80 hover:text-white hover:bg-white/20 gap-1.5 h-8 px-2.5 ${showActivity ? "bg-white/20" : ""}`}
          >
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium hidden sm:inline">Activity</span>
          </Button>

          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white/20 text-white">
            {userRole.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Main content + optional activity panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Columns */}
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
              <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                {columns.map((col) => (
                  <SortableColumn
                    key={col.id}
                    column={col}
                    boardId={boardId}
                    canEdit={canEdit}
                    onCardAdded={handleCardAdded}
                    onCardClick={handleCardClick}
                  />
                ))}
              </SortableContext>
              {canEdit && <AddColumnButton boardId={boardId} onColumnAdded={handleColumnAdded} />}
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeCard   && <CardOverlay   card={activeCard} />}
            {activeColumn && <ColumnOverlay column={activeColumn} />}
          </DragOverlay>
        </DndContext>

        {/* Board activity panel */}
        {showActivity && (
          <BoardActivityPanel boardId={boardId} onClose={() => setShowActivity(false)} />
        )}
      </div>

      {/* Card detail modal */}
      {selectedCard && selectedCardColumn && (
        <CardModal
          card={selectedCard}
          columnTitle={selectedCardColumn.title}
          boardId={boardId}
          members={members}
          labels={labels}
          canEdit={canEdit}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={handleCardUpdated}
        />
      )}

      {/* Members management dialog */}
      <MembersDialog
        open={showMembers}
        onClose={() => setShowMembers(false)}
        boardId={boardId}
        currentUserId={currentUserId}
        initialMembers={members}
        isOwner={isOwner}
        onMembersChange={setMembers}
      />
    </div>
  );
}
