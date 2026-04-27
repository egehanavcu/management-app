import type {
  User,
  Board,
  BoardMember,
  Column,
  Card,
  Activity,
  Label,
  CardLabel,
  CardAssignee,
  Role,
  ActionType,
} from "@/generated/prisma";

// ─── Re-export Prisma enums ───────────────────────────────────────────────────

export type { Role, ActionType };

// ─── Base entity types (direct from Prisma) ──────────────────────────────────

export type { User, Board, BoardMember, Column, Card, Activity, Label, CardLabel, CardAssignee };

// ─── Safe public user (strips password) ──────────────────────────────────────

export type PublicUser = Omit<User, "password">;

// ─── Board with nested relations ─────────────────────────────────────────────

export type BoardWithColumns = Board & {
  columns: ColumnWithCards[];
  members: BoardMemberWithUser[];
};

export type BoardSummary = Board & {
  members: BoardMember[];
  _count: { columns: number };
};

// ─── Column ───────────────────────────────────────────────────────────────────

export type ColumnWithCards = Column & {
  cards: CardWithRelations[];
};

// ─── Card ─────────────────────────────────────────────────────────────────────

export type CardWithRelations = Card & {
  assignees: (CardAssignee & { user: PublicUser })[];
  labels: (CardLabel & { label: Label })[];
};

// ─── BoardMember ──────────────────────────────────────────────────────────────

export type BoardMemberWithUser = BoardMember & {
  user: PublicUser;
};

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateBoardPayload {
  title: string;
  description?: string;
}

export interface UpdateBoardPayload {
  title?: string;
  description?: string;
}

export interface CreateColumnPayload {
  boardId: string;
  title: string;
}

export interface UpdateColumnPayload {
  title?: string;
  position?: number;
}

export interface CreateCardPayload {
  columnId: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignedUserId?: string;
}

export interface UpdateCardPayload {
  title?: string;
  description?: string;
  dueDate?: string | null;
}

export interface MoveCardPayload {
  newColumnId: string;
  newPosition: number;
}

// ─── Session / Auth ───────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// ─── RBAC helpers ─────────────────────────────────────────────────────────────

export const ROLE_WEIGHTS: Record<Role, number> = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_WEIGHTS[userRole] >= ROLE_WEIGHTS[minRole];
}
