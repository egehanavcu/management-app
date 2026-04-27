"use server";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DndCard, DndColumn, BoardLabel } from "@/types/dnd";

export type ActionState      = { error?: string; success?: boolean; boardId?: string };
export type CreateCardState  = { error?: string; success?: boolean; card?: DndCard };
export type CreateColumnState = { error?: string; success?: boolean; column?: DndColumn };

// ─── Board ────────────────────────────────────────────────────────────────────

export async function updateBoardTitle(
  boardId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const trimmed = title.trim();
  if (!trimmed) return { success: false, error: "Board title cannot be empty" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can rename boards" };

  try {
    await prisma.board.update({ where: { id: boardId }, data: { title: trimmed } });
    // Invalidate the board page AND the boards list (sidebar) so both reflect the new name.
    revalidatePath(`/boards/${boardId}`);
    revalidatePath("/boards");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to rename board. Please try again." };
  }
}

const DEFAULT_LABELS = [
  { name: "Bug",           color: "red"    },
  { name: "Feature",       color: "blue"   },
  { name: "Improvement",   color: "green"  },
  { name: "Documentation", color: "purple" },
  { name: "Priority",      color: "orange" },
  { name: "Question",      color: "yellow" },
];

export async function createBoard(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Board title is required" };
  try {
    const board = await prisma.board.create({
      data: {
        title,
        description: (formData.get("description") as string)?.trim() || undefined,
        members: { create: { userId: session.user.id, role: "OWNER" } },
        labels: { createMany: { data: DEFAULT_LABELS } },
      },
    });
    revalidatePath("/boards");
    return { success: true, boardId: board.id };
  } catch {
    return { error: "Failed to create board. Please try again." };
  }
}

export async function updateBoardDescription(
  boardId: string,
  description: string | null
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can edit the description" };

  try {
    await prisma.board.update({
      where: { id: boardId },
      data: { description: description?.trim() || null },
    });
    revalidatePath(`/boards/${boardId}`);
    revalidatePath("/boards");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update description. Please try again." };
  }
}

export async function deleteBoardAction(boardId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "OWNER")) return { error: "Only owners can delete boards" };
  try {
    await prisma.$transaction(async (tx) => {
      // Collect every column and card ID under this board so we can wipe
      // their activity rows before the cascade runs.  This avoids SET NULL
      // failures on Activity.cardId / fromColumnId / toColumnId which occur
      // when those columns still carry a NOT NULL constraint in the DB.
      const columns = await tx.column.findMany({
        where: { boardId },
        select: { id: true, cards: { select: { id: true } } },
      });
      const colIds  = columns.map((c) => c.id);
      const cardIds = columns.flatMap((c) => c.cards.map((card) => card.id));

      await tx.activity.deleteMany({
        where: {
          OR: [
            { boardId },
            ...(cardIds.length   ? [{ cardId:       { in: cardIds } }] : []),
            ...(colIds.length    ? [{ fromColumnId: { in: colIds  } }] : []),
            ...(colIds.length    ? [{ toColumnId:   { in: colIds  } }] : []),
          ],
        },
      });

      await tx.board.delete({ where: { id: boardId } });
    });

    revalidatePath("/boards");
  } catch (err) {
    console.error("[deleteBoardAction] board:", boardId, err);
    return { error: "Failed to delete board. Please try again." };
  }
  redirect("/boards");
}

export async function createLabel(
  boardId: string,
  name: string,
  color: string
): Promise<{ success: boolean; error?: string; label?: BoardLabel }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can create labels" };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Label name is required" };

  try {
    const label = await prisma.label.create({
      data: { name: trimmed, color, boardId },
    });
    revalidatePath(`/boards/${boardId}`);
    return { success: true, label: { id: label.id, name: label.name, color: label.color } };
  } catch {
    return { success: false, error: "Failed to create label" };
  }
}

// ─── Column ───────────────────────────────────────────────────────────────────

export async function renameColumn(
  columnId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const trimmed = title.trim();
  if (!trimmed) return { success: false, error: "Column title cannot be empty" };

  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return { success: false, error: "Column not found" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can rename columns" };

  const oldTitle = column.title;
  try {
    await prisma.$transaction([
      prisma.column.update({ where: { id: columnId }, data: { title: trimmed } }),
      prisma.activity.create({
        data: {
          action: "COLUMN_UPDATE",
          boardId: column.boardId,
          userId: session.user.id,
          metadata: JSON.stringify({ oldTitle, newTitle: trimmed }),
        },
      }),
    ]);
    revalidatePath(`/boards/${column.boardId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to rename column. Please try again." };
  }
}

export async function deleteColumn(
  columnId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return { success: false, error: "Column not found" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can delete columns" };

  try {
    await prisma.$transaction([
      prisma.activity.create({
        data: {
          action: "COLUMN_DELETE",
          boardId: column.boardId,
          userId: session.user.id,
          metadata: JSON.stringify({ columnTitle: column.title }),
        },
      }),
      prisma.column.delete({ where: { id: columnId } }),
    ]);
    revalidatePath(`/boards/${column.boardId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete column. Please try again." };
  }
}

export async function createColumn(
  _prev: CreateColumnState,
  formData: FormData
): Promise<CreateColumnState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const boardId = formData.get("boardId") as string;
  const title   = (formData.get("title") as string)?.trim();
  if (!boardId || !title) return { error: "Column title is required" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { error: "You don't have permission to add columns" };
  try {
    const col = await prisma.$transaction(async (tx) => {
      const last = await tx.column.findFirst({ where: { boardId }, orderBy: { position: "desc" } });
      const created = await tx.column.create({
        data: { title, boardId, position: last ? last.position + 1 : 1 },
      });
      await tx.activity.create({
        data: {
          action: "COLUMN_CREATE",
          boardId,
          userId: session.user.id,
          metadata: JSON.stringify({ columnTitle: title }),
        },
      });
      return created;
    });
    revalidatePath(`/boards/${boardId}`);
    return { success: true, column: { id: col.id, title: col.title, position: col.position, boardId: col.boardId, cards: [] } };
  } catch { return { error: "Failed to create column. Please try again." }; }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export async function createCard(
  _prev: CreateCardState,
  formData: FormData
): Promise<CreateCardState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const columnId = formData.get("columnId") as string;
  const boardId  = formData.get("boardId") as string;
  const title    = (formData.get("title") as string)?.trim();
  if (!columnId || !boardId || !title) return { error: "Card title is required" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { error: "You don't have permission to add cards" };
  try {
    const card = await prisma.$transaction(async (tx) => {
      const last = await tx.card.findFirst({ where: { columnId }, orderBy: { position: "desc" } });
      const created = await tx.card.create({
        data: { title, columnId, position: last ? last.position + 1 : 1 },
      });
      await tx.activity.create({
        data: { action: "CREATED", boardId, cardId: created.id, userId: session.user.id },
      });
      return created;
    });
    revalidatePath(`/boards/${boardId}`);
    return {
      success: true,
      card: { id: card.id, title: card.title, description: card.description, position: card.position, columnId: card.columnId, dueDate: card.dueDate, assignees: [], labels: [] },
    };
  } catch { return { error: "Failed to create card. Please try again." }; }
}

export type UpdateCardInput = {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
};

export async function updateCard(
  cardId: string,
  data: UpdateCardInput
): Promise<{ success: boolean; error?: string; card?: DndCard }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const existing = await prisma.card.findUnique({ where: { id: cardId }, include: { column: true } });
  if (!existing) return { success: false, error: "Card not found" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: existing.column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Forbidden" };
  const titleChanged = data.title !== undefined && data.title.trim() !== existing.title;
  const descChanged  = data.description !== undefined &&
    (data.description ?? "") !== (existing.description ?? "");
  const prevDateStr  = existing.dueDate ? existing.dueDate.toISOString().split("T")[0] : null;
  const nextDateStr  = data.dueDate !== undefined ? (data.dueDate || null) : undefined;
  const dueDateChanged = nextDateStr !== undefined && nextDateStr !== prevDateStr;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const card = await tx.card.update({
        where: { id: cardId },
        data: {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate !== undefined
            ? (data.dueDate ? new Date(data.dueDate) : null)
            : undefined,
        },
        include: {
          assignees: { include: { user: { omit: { password: true } } } },
          labels: { include: { label: true } },
        },
      });
      if (titleChanged) {
        await tx.activity.create({
          data: {
            action: "UPDATED",
            boardId: existing.column.boardId,
            cardId,
            userId: session.user.id,
            metadata: JSON.stringify({ oldTitle: existing.title, newTitle: data.title!.trim() }),
          },
        });
      }
      if (descChanged) {
        await tx.activity.create({
          data: {
            action: "UPDATED",
            boardId: existing.column.boardId,
            cardId,
            userId: session.user.id,
            metadata: JSON.stringify({ type: "description" }),
          },
        });
      }
      if (dueDateChanged) {
        await tx.activity.create({
          data: {
            action: "DUE_DATE_UPDATE",
            boardId: existing.column.boardId,
            cardId,
            userId: session.user.id,
            metadata: JSON.stringify({ date: nextDateStr }),
          },
        });
      }
      return card;
    });
    revalidatePath(`/boards/${existing.column.boardId}`);
    return {
      success: true,
      card: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        position: updated.position,
        columnId: updated.columnId,
        dueDate: updated.dueDate,
        assignees: updated.assignees.map((a) => ({ id: a.user.id, name: a.user.name, email: a.user.email })),
        labels: updated.labels.map((l) => ({ label: { id: l.label.id, name: l.label.name, color: l.label.color } })),
      },
    };
  } catch { return { success: false, error: "Failed to update card" }; }
}

export async function toggleCardAssignee(
  cardId: string,
  targetUserId: string,
  add: boolean,
  boardId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Forbidden" };
  try {
    await prisma.$transaction([
      add
        ? prisma.cardAssignee.upsert({
            where: { cardId_userId: { cardId, userId: targetUserId } },
            create: { cardId, userId: targetUserId },
            update: {},
          })
        : prisma.cardAssignee.delete({
            where: { cardId_userId: { cardId, userId: targetUserId } },
          }),
      prisma.activity.create({
        data: {
          action: add ? "ASSIGNED" : "UNASSIGNED",
          boardId,
          cardId,
          userId: session.user.id,
          targetUserId,
        },
      }),
    ]);
    return { success: true };
  } catch { return { success: false, error: "Failed to update assignee" }; }
}

export async function toggleCardLabel(
  cardId: string,
  labelId: string,
  add: boolean,
  boardId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Forbidden" };
  const label = await prisma.label.findUnique({ where: { id: labelId } });
  try {
    await prisma.$transaction([
      add
        ? prisma.cardLabel.upsert({
            where: { cardId_labelId: { cardId, labelId } },
            create: { cardId, labelId },
            update: {},
          })
        : prisma.cardLabel.delete({ where: { cardId_labelId: { cardId, labelId } } }),
      prisma.activity.create({
        data: {
          action: add ? "LABEL_ADD" : "LABEL_REMOVE",
          boardId,
          cardId,
          userId: session.user.id,
          metadata: JSON.stringify({ labelName: label?.name ?? "", labelColor: label?.color ?? "" }),
        },
      }),
    ]);
    return { success: true };
  } catch { return { success: false, error: "Failed to update label" }; }
}

export async function deleteCard(
  cardId: string,
  boardId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { column: true } });
  if (!card) return { success: false, error: "Card not found" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Forbidden" };
  try {
    // Log DELETED first — after card.delete the activity's cardId becomes NULL (SetNull),
    // but boardId + metadata preserve the context for the global activity feed.
    await prisma.$transaction([
      prisma.activity.create({
        data: {
          action: "DELETED",
          boardId: card.column.boardId,
          cardId,
          userId: session.user.id,
          metadata: JSON.stringify({ cardTitle: card.title }),
        },
      }),
      prisma.card.delete({ where: { id: cardId } }),
    ]);
    revalidatePath(`/boards/${boardId}`);
    return { success: true };
  } catch { return { success: false, error: "Failed to delete card" }; }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
