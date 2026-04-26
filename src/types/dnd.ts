export type DndCard = {
  id: string;
  title: string;
  position: number;
  columnId: string;
  dueDate: Date | null;
  assignedUser: { id: string; name: string | null; email: string | null } | null;
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
  id: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  user: { name: string | null; email: string | null };
};

// ─── Drag data: attached to useSortable's `data` option ──────────────────────
// Used to identify WHAT is being dragged.

export type CardDragData = {
  type: "card";
  card: DndCard;
};

export type ColumnDragData = {
  type: "column";
  column: DndColumn;
};

// ─── Drop data: attached to useDroppable's `data` option ─────────────────────
// Identifies an empty-column drop zone (distinct from a sortable column target).

export type ColumnDropData = {
  type: "column-drop";
  columnId: string;
};
