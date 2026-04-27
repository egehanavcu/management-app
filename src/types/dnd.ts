export type DndCard = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  columnId: string;
  dueDate: Date | null;
  assignees: Array<{ id: string; name: string | null; email: string | null }>;
  labels: Array<{ label: { id: string; name: string; color: string } }>;
};

export type DndColumn = {
  id: string;
  title: string;
  position: number;
  boardId: string;
  cards: DndCard[];
};

export type DndBoardMember = {
  id: string;       // membership ID
  userId: string;   // user ID — needed for role/remove API calls
  role: "OWNER" | "EDITOR" | "VIEWER";
  user: { name: string | null; email: string | null };
};

export type BoardLabel = {
  id: string;
  name: string;
  color: string;
};

// ─── Drag data: attached to useSortable's `data` option ──────────────────────
export type CardDragData   = { type: "card";   card: DndCard };
export type ColumnDragData = { type: "column"; column: DndColumn };

// ─── Drop data: attached to useDroppable's `data` option ─────────────────────
// "column-drop" is the empty-column droppable zone (distinct from a draggable column).
export type ColumnDropData = { type: "column-drop"; columnId: string };
