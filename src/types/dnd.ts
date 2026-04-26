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

// Data payloads attached to dnd-kit active/over items
export type CardDragData = {
  type: "card";
  card: DndCard;
};

export type ColumnDropData = {
  type: "column";
  columnId: string;
};
