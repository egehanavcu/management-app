"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners, pointerWithin,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Users, Activity, UserPlus, Settings, Trash2, Menu } from "lucide-react";
import { SortableColumn }             from "@/components/column/SortableColumn";
import { ColumnOverlay }              from "@/components/column/ColumnOverlay";
import { AddColumnButton }            from "@/components/column/AddColumnButton";
import { CardOverlay }                from "@/components/card/CardOverlay";
import { CardModal }                  from "@/components/card/CardModal";
import { MembersDialog }              from "./MembersDialog";
import { BoardActivityPanel }         from "./BoardActivityPanel";
import { EditableBoardTitle }         from "./EditableBoardTitle";
import { EditableBoardDescription }   from "./EditableBoardDescription";
import { Button }                     from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import { calculateNewPosition }       from "@/lib/position";
import { getInitials }               from "@/lib/utils";
import { renameColumn, deleteColumn, deleteBoardAction, updateBoardDescription, toggleCardLabel, createLabel, toggleCardAssignee, deleteCard } from "@/lib/actions";
import { useMobileSidebar }           from "./MobileSidebarProvider";
import type { DndCard, DndColumn, DndBoardMember, BoardLabel, CardDragData, ColumnDragData, ColumnDropData } from "@/types/dnd";
import type { Role } from "@/generated/prisma";

interface BoardClientProps {
  boardId: string;
  boardTitle: string;
  boardDescription: string | null;
  members: DndBoardMember[];
  labels: BoardLabel[];
  initialColumns: DndColumn[];
  userRole: Role;
  isNewBoard?: boolean;
}

function MemberAvatar({ name, email }: { name: string | null; email: string | null }) {
  const label   = name ?? email ?? "?";
  const initials = getInitials(label);
  return (
    <div
      title={label}
      className="w-7 h-7 rounded-full bg-white/30 text-white flex items-center justify-center text-[11px] font-semibold transition-transform duration-200 hover:-translate-y-0.5"
    >
      {initials}
    </div>
  );
}

function findCardColumn(cardId: string, cols: DndColumn[]) {
  return cols.find((c) => c.cards.some((card) => card.id === cardId));
}

export function BoardClient({ boardId, boardTitle, boardDescription, members: initialMembers, labels: initialLabels, initialColumns, userRole, isNewBoard }: BoardClientProps) {
  const [columns,            setColumns]           = useState<DndColumn[]>(initialColumns);
  const [members,            setMembers]           = useState<DndBoardMember[]>(initialMembers);
  const [labels,             setLabels]            = useState<BoardLabel[]>(initialLabels);
  const [activeCard,         setActiveCard]        = useState<DndCard | null>(null);
  const [activeColumn,       setActiveColumn]      = useState<DndColumn | null>(null);
  const [selectedCardId,     setSelectedCardId]    = useState<string | null>(null);
  const [showMembers,        setShowMembers]       = useState(false);
  const [showActivity,       setShowActivity]      = useState(false);
  const [syncing,            setSyncing]           = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  // Strip the ?new=1&title=… params that were used to skip loading.tsx. Done
  // via the History API so Next.js doesn't treat it as a new navigation.
  useEffect(() => {
    if (isNewBoard) {
      window.history.replaceState(null, "", `/boards/${boardId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced helper — prevents a burst of rapid card moves from triggering
  // multiple panel refetches. The ref lets zero-dep callbacks (handleDragEnd)
  // call the latest version without adding it to their dep arrays.
  const activityRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpActivity = useCallback(() => {
    if (activityRefreshTimer.current) clearTimeout(activityRefreshTimer.current);
    activityRefreshTimer.current = setTimeout(() => setActivityRefreshKey((k) => k + 1), 800);
  }, []);
  const bumpActivityRef = useRef(bumpActivity);
  bumpActivityRef.current = bumpActivity;
  const preDragSnapshot   = useRef<DndColumn[]>(initialColumns);
  // Always-current ref so drag handlers read fresh state even if React hasn't
  // re-rendered since the last setColumns call (stale-closure guard).
  const latestColumnsRef  = useRef<DndColumn[]>(columns);
  latestColumnsRef.current = columns;
  // Set synchronously in handleDragStart so collision detection knows the active
  // drag type from the very first event, before any React state re-render.
  const activeDragTypeRef = useRef<"card" | "column" | null>(null);

  const canEdit              = userRole === "OWNER" || userRole === "EDITOR";
  const isOwner              = userRole === "OWNER";
  const columnIds            = columns.map((c) => c.id);
  const { setOpen: openNav } = useMobileSidebar();

  // Current session user ID — find from members list
  // (the current user IS in the members list, we can identify by role match; use a safer approach)
  // We'll expose it through the page. For now derive from the OWNER member if isOwner, else rely on API.
  const currentUserId   = members.find((m) => m.role === userRole)?.userId ?? "";
  const currentUserInfo = members.find((m) => m.userId === currentUserId)?.user ?? { name: null, email: null };

  // ─── Child callbacks ──────────────────────────────────────────────────────
  const handleCardAdded = useCallback((card: DndCard) => {
    setColumns((prev) => prev.map((col) => col.id === card.columnId ? { ...col, cards: [...col.cards, card] } : col));
    bumpActivity();
  }, [bumpActivity]);

  const handleColumnAdded = useCallback((column: DndColumn) => {
    setColumns((prev) => [...prev, column]);
    bumpActivity();
  }, [bumpActivity]);

  const handleCardUpdated = useCallback((updated: DndCard) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === updated.id ? updated : c)),
      }))
    );
  }, []);

  const handleCardDeleted = useCallback(async () => {
    const cardId = selectedCardId;
    if (!cardId) return;
    setSyncing(true);
    const result = await deleteCard(cardId, boardId);
    setSyncing(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to delete card");
      return;
    }
    setColumns((prev) =>
      prev.map((col) => ({ ...col, cards: col.cards.filter((c) => c.id !== cardId) }))
    );
    setSelectedCardId(null);
    bumpActivity();
  }, [selectedCardId, boardId, bumpActivity]);

  const handleCardClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  // Optimistic rename: update columns state immediately, rollback on failure.
  const handleColumnRenamed = useCallback(async (columnId: string, newTitle: string): Promise<boolean> => {
    const prevTitle = columns.find((c) => c.id === columnId)?.title ?? "";
    setColumns((prev) => prev.map((c) => c.id === columnId ? { ...c, title: newTitle } : c));

    const result = await renameColumn(columnId, newTitle);
    if (!result.success) {
      setColumns((prev) => prev.map((c) => c.id === columnId ? { ...c, title: prevTitle } : c));
      toast.error(result.error ?? "Failed to rename column");
      return false;
    }
    bumpActivity();
    return true;
  }, [columns, bumpActivity]);

  // Non-optimistic delete: wait for server confirmation before removing from state.
  // The Column component shows a "Deleting…" overlay while in flight.
  const handleColumnDeleted = useCallback(async (column: DndColumn): Promise<boolean> => {
    const result = await deleteColumn(column.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to delete column");
      return false;
    }
    setColumns((prev) => prev.filter((c) => c.id !== column.id));
    bumpActivity();
    return true;
  }, [bumpActivity]);

  const handleLabelToggled = useCallback(async (labelId: string, add: boolean): Promise<boolean> => {
    // Capture the card ID synchronously — selectedCardId could change while awaiting.
    const cardId = selectedCardId;
    if (!cardId) return false;

    // Optimistic update: mutate the card's labels array in columns state so
    // CardItem strips reflect the change before the server responds.
    const applyToColumns = (a: boolean) =>
      setColumns((prev) => prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id !== cardId) return card;
          if (a) {
            const boardLabel = labels.find((l) => l.id === labelId);
            if (!boardLabel) return card;
            return { ...card, labels: [...card.labels, { label: boardLabel }] };
          }
          return { ...card, labels: card.labels.filter((l) => l.label.id !== labelId) };
        }),
      })));

    applyToColumns(add);
    setSyncing(true);
    const result = await toggleCardLabel(cardId, labelId, add, boardId);
    setSyncing(false);

    if (!result.success) {
      applyToColumns(!add);  // rollback
      toast.error(result.error ?? "Failed to update label");
      return false;
    }
    bumpActivity();
    return true;
  }, [selectedCardId, boardId, labels, bumpActivity]);

  const handleAssigneeToggled = useCallback(async (targetUserId: string, add: boolean): Promise<boolean> => {
    const cardId = selectedCardId;
    if (!cardId) return false;

    const apply = (a: boolean) =>
      setColumns((prev) => prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id !== cardId) return card;
          if (a) {
            const member = members.find((m) => m.userId === targetUserId);
            if (!member) return card;
            return { ...card, assignees: [...card.assignees, { id: targetUserId, name: member.user.name, email: member.user.email }] };
          }
          return { ...card, assignees: card.assignees.filter((a) => a.id !== targetUserId) };
        }),
      })));

    apply(add);
    setSyncing(true);
    const result = await toggleCardAssignee(cardId, targetUserId, add, boardId);
    setSyncing(false);
    if (!result.success) {
      apply(!add);
      toast.error(result.error ?? "Failed to update assignee");
      return false;
    }
    bumpActivity();
    return true;
  }, [selectedCardId, boardId, members, bumpActivity]);

  const handleLabelCreated = useCallback(async (name: string, color: string): Promise<boolean> => {
    setSyncing(true);
    const result = await createLabel(boardId, name, color);
    setSyncing(false);
    if (!result.success || !result.label) {
      toast.error(result.error ?? "Failed to create label");
      return false;
    }
    setLabels((prev) => [...prev, result.label!]);
    return true;
  }, [boardId]);

  const handleDescriptionChanged = useCallback(async (newDescription: string | null): Promise<boolean> => {
    setSyncing(true);
    const result = await updateBoardDescription(boardId, newDescription);
    setSyncing(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to update description");
      return false;
    }
    bumpActivity();
    return true;
  }, [boardId, bumpActivity]);

  const handleDeleteBoard = useCallback(async () => {
    setShowDeleteConfirm(false);
    const result = await deleteBoardAction(boardId);
    if (result?.error) toast.error(result.error ?? "Failed to delete board");
    // On success deleteBoardAction redirects — we never reach this line
  }, [boardId]);

  // ─── Derive selected card ─────────────────────────────────────────────────
  const selectedCard = selectedCardId
    ? columns.flatMap((c) => c.cards).find((c) => c.id === selectedCardId) ?? null
    : null;
  const selectedCardColumn = selectedCardId
    ? columns.find((col) => col.cards.some((c) => c.id === selectedCardId)) ?? null
    : null;

  // ─── Sensors ─────────────────────────────────────────────────────────────
  const sensors = useSensors(
    // Mouse: start after 8px movement so accidental micro-moves don't trigger
    useSensor(MouseSensor,    { activationConstraint: { distance: 8 } }),
    // Touch: require a 250ms long-press; tolerance:5 ignores minor finger tremor
    // without cancelling the press
    useSensor(TouchSensor,    { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─── Collision detection ─────────────────────────────────────────────────
  // Uses activeDragTypeRef (set synchronously in handleDragStart) so the correct
  // path is taken from the very first event, before React re-renders with the new
  // activeColumn state.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const colIds = latestColumnsRef.current.map((c) => c.id);

    if (activeDragTypeRef.current === "column") {
      // Restrict candidates to column-level droppables only.
      // Without this, cards inside a dense target column win the closest-corner
      // calculation and the column never swaps with its neighbour.
      return closestCorners({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          ({ id }) => colIds.includes(String(id))
        ),
      });
    }

    // Card drag: pointerWithin reliably detects empty column droppables.
    // Prefer a card collision over the column background when both are hit.
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const cardCollision = pointerCollisions.find(({ id }) => !colIds.includes(String(id)));
      return cardCollision ? [cardCollision] : pointerCollisions;
    }

    return closestCorners(args);
  }, []);

  // ─── Drag start ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    preDragSnapshot.current   = latestColumnsRef.current;
    const data = active.data.current as CardDragData | ColumnDragData | undefined;
    activeDragTypeRef.current = data?.type ?? null;   // synchronous — collision detection reads this immediately
    if (data?.type === "card")   { setActiveCard(data.card);     setActiveColumn(null); }
    if (data?.type === "column") { setActiveColumn(data.column); setActiveCard(null); }
    // Subtle haptic pulse on touch devices to confirm the long-press registered
    window.navigator.vibrate?.(10);
  }, []);

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
    activeDragTypeRef.current = null;

    if (!over) { setColumns(snapshot); return; }

    // ── Column reorder ───────────────────────────────────────────────────────
    if (activeType === "column") {
      const cols   = latestColumnsRef.current;
      const newIdx = cols.findIndex((c) => c.id === activeId);
      const oldIdx = snapshot.findIndex((c) => c.id === activeId);

      // No-op: dropped on itself or back to the same position
      if (newIdx === -1 || newIdx === oldIdx) { setColumns(snapshot); return; }

      const siblings    = cols.filter((c) => c.id !== activeId);
      const newPosition = calculateNewPosition(siblings, newIdx);
      setColumns((prev) => prev.map((c) => c.id === activeId ? { ...c, position: newPosition } : c));
      setSyncing(true);
      fetch(`/api/columns/${activeId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: newPosition }),
      })
        .then((r) => { if (!r.ok) throw new Error(); bumpActivityRef.current(); })
        .catch(() => { setColumns(snapshot); toast.error("Couldn't save column position — changes reverted."); })
        .finally(() => setSyncing(false));
      return;
    }

    if (activeType !== "card") return;

    const overId     = String(over.id);
    const latestCols = latestColumnsRef.current;

    // Is the drop target a column container (empty column) or a card?
    const isColumnDrop = latestCols.some((c) => c.id === overId);

    if (isColumnDrop) {
      // ── Empty column drop ──────────────────────────────────────────────────
      const targetColumnId = overId;
      const sourceCol = findCardColumn(activeId, latestCols);
      if (!sourceCol) { setColumns(snapshot); return; }

      // No-op: dropped back onto its own (now-empty) column
      if (sourceCol.id === targetColumnId) { setColumns(snapshot); return; }

      const newPosition = 1024.0;
      const movedCard   = sourceCol.cards.find((c) => c.id === activeId)!;

      setColumns(latestCols.map((col) => {
        const withoutCard = col.cards.filter((c) => c.id !== activeId);
        if (col.id === targetColumnId)
          return { ...col, cards: [...withoutCard, { ...movedCard, columnId: targetColumnId, position: newPosition }] };
        if (col.id === sourceCol.id)
          return { ...col, cards: withoutCard };
        return col;
      }));
      setSyncing(true);
      fetch(`/api/cards/${activeId}/move`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newColumnId: targetColumnId, newPosition }),
      })
        .then((r) => { if (!r.ok) throw new Error(); bumpActivityRef.current(); })
        .catch(() => { setColumns(snapshot); toast.error("Couldn't save card position — changes reverted."); })
        .finally(() => setSyncing(false));
      return;
    }

    // ── Card drop (same or cross column) ──────────────────────────────────────
    // handleDragOver has already reordered the cards in latestCols.
    const finalCol = findCardColumn(activeId, latestCols);
    if (!finalCol) { setColumns(snapshot); return; }
    const finalIdx = finalCol.cards.findIndex((c) => c.id === activeId);
    if (finalIdx === -1) { setColumns(snapshot); return; }

    // No-op: card is in the same column at the same index as before the drag
    const snapCol  = findCardColumn(activeId, snapshot);
    const snapIdx  = snapCol?.cards.findIndex((c) => c.id === activeId) ?? -1;
    if (finalCol.id === snapCol?.id && finalIdx === snapIdx) {
      setColumns(snapshot);
      return;
    }

    const siblings    = finalCol.cards.filter((c) => c.id !== activeId);
    const newPosition = calculateNewPosition(siblings, finalIdx);

    setColumns((prev) => prev.map((col) => ({
      ...col,
      cards: col.cards.map((c) => c.id === activeId
        ? { ...c, position: newPosition, columnId: finalCol.id }
        : c),
    })));
    setSyncing(true);
    fetch(`/api/cards/${activeId}/move`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newColumnId: finalCol.id, newPosition }),
    })
      .then((r) => { if (!r.ok) throw new Error(); bumpActivityRef.current(); })
      .catch(() => { setColumns(snapshot); toast.error("Couldn't save card position — changes reverted."); })
      .finally(() => setSyncing(false));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveCard(null); setActiveColumn(null);
    activeDragTypeRef.current = null;
    setColumns(preDragSnapshot.current);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Board header */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2.5 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => openNav(true)}
          className="flex md:hidden text-white/80 hover:text-white transition-colors flex-shrink-0 p-0.5"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Left: title + description */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <EditableBoardTitle
              boardId={boardId}
              initialTitle={boardTitle}
              canEdit={canEdit}
              syncing={syncing}
              onSaved={bumpActivity}
            />
          </div>
          {/* Description hidden on small screens to save header height */}
          <div className="hidden sm:block">
            <EditableBoardDescription
              boardId={boardId}
              initialDescription={boardDescription}
              canEdit={canEdit}
              onDescriptionChanged={handleDescriptionChanged}
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* Member avatars — hidden on mobile to save space */}
          <div className="hidden md:flex items-center gap-x-1">
            {members.slice(0, 5).map((m) => (
              <MemberAvatar key={m.id} name={m.user.name} email={m.user.email} />
            ))}
            {members.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-white/30 text-white flex items-center justify-center text-[11px] font-semibold">
                +{members.length - 5}
              </div>
            )}
          </div>

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

          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white/20 text-white">
            {userRole.toLowerCase()}
          </span>

          {/* Settings — OWNER only */}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-8 w-8 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/20 transition-colors focus:outline-none"
                aria-label="Board settings"
              >
                <Settings className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main content + optional activity panel */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Columns */}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div
            className="flex-1 overflow-x-auto overflow-y-hidden"
            style={{ touchAction: activeCard || activeColumn ? "none" : "pan-x" }}
          >
            <div className="flex gap-3 p-4 h-full items-start min-w-max">
              <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                {columns.map((col) => (
                  <SortableColumn
                    key={col.id}
                    column={col}
                    boardId={boardId}
                    canEdit={canEdit}
                    activeCardId={activeCard?.id}
                    onCardAdded={handleCardAdded}
                    onCardClick={handleCardClick}
                    onColumnRenamed={handleColumnRenamed}
                    onColumnDeleted={handleColumnDeleted}
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

        {/* Board activity panel — always mounted so Sheet exit animation plays on mobile */}
        <BoardActivityPanel
          boardId={boardId}
          open={showActivity}
          onClose={() => setShowActivity(false)}
          refreshKey={activityRefreshKey}
        />
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
          currentUser={currentUserInfo}
          onCardDeleted={handleCardDeleted}
          onLabelToggled={handleLabelToggled}
          onLabelCreated={handleLabelCreated}
          onAssigneeToggled={handleAssigneeToggled}
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
        onSyncChange={setSyncing}
      />

      {/* Delete board confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="h-5 w-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{boardTitle}</strong> and all its columns and
              cards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteBoard}>
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
