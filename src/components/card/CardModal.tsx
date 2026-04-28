"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, AlignLeft, Tag, Users, Clock, Loader2, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { updateCard } from "@/lib/actions";
import { LABEL_COLORS, getLabelColor } from "@/lib/label-colors";
import { getInitials, formatDueDate } from "@/lib/utils";
import type { DndCard, DndBoardMember, BoardLabel } from "@/types/dnd";

function fmt(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

type Activity = {
  id: string;
  action: string;
  createdAt: string;
  metadata:   string | null;
  user:       { name: string | null; email: string | null };
  fromColumn: { title: string } | null;
  toColumn:   { title: string } | null;
  targetUser: { name: string | null; email: string | null } | null;
};

interface CardModalProps {
  card: DndCard;
  columnTitle: string;
  boardId: string;
  currentUser: { name: string | null; email: string | null };
  members: DndBoardMember[];
  labels: BoardLabel[];
  canEdit: boolean;
  onClose: () => void;
  onCardUpdated: (card: DndCard) => void;
  onCardDeleted: () => Promise<void>;
  onLabelToggled: (labelId: string, add: boolean) => Promise<boolean>;
  onLabelCreated: (name: string, color: string) => Promise<boolean>;
  onAssigneeToggled: (userId: string, add: boolean) => Promise<boolean>;
}

export function CardModal({
  card, columnTitle, currentUser, members, labels, canEdit,
  onClose, onCardUpdated, onCardDeleted, onLabelToggled, onLabelCreated, onAssigneeToggled,
}: CardModalProps) {
  const [title,           setTitle]          = useState(card.title);
  const [description,     setDescription]    = useState(card.description ?? "");
  const [dueDate,         setDueDate]        = useState(fmt(card.dueDate));
  const [activeAssignees, setActiveAssignees] = useState<Set<string>>(
    new Set(card.assignees.map((a) => a.id))
  );
  const [activeLabels,    setActiveLabels]   = useState<Set<string>>(
    new Set(card.labels.map((l) => l.label.id))
  );

  // Create-label inline form state
  const [showCreate,   setShowCreate]   = useState(false);
  const [newName,      setNewName]      = useState("");
  const [newColor,     setNewColor]     = useState<string>(LABEL_COLORS[4].key); // blue default
  const [creating,     setCreating]     = useState(false);

  const [activities, setActivities]  = useState<Activity[]>([]);
  const [actLoading, setActLoading]  = useState(true);
  const [saving,     setSaving]      = useState(false);
  const [deleting,   setDeleting]    = useState(false);

  useEffect(() => {
    setActLoading(true);
    fetch(`/api/cards/${card.id}/activity`)
      .then((r) => r.json())
      .then(setActivities)
      .catch(() => {})
      .finally(() => setActLoading(false));
  }, [card.id]);

  const save = useCallback(
    async (patch: Parameters<typeof updateCard>[1]) => {
      setSaving(true);
      const result = await updateCard(card.id, patch);
      setSaving(false);
      if (result.success && result.card) {
        onCardUpdated(result.card);
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    },
    [card.id, onCardUpdated]
  );

  // Dedicated handler for description blur — guards against no-op saves and
  // prepends an optimistic activity so the user sees instant confirmation.
  const handleDescriptionSave = useCallback(async () => {
    const next = description.trim() || null;
    const prev = (card.description ?? "").trim() || null;
    if (next === prev) return;  // nothing changed, skip entirely

    const optimisticId  = `opt-${Date.now()}`;
    const optimisticAct: Activity = {
      id: optimisticId,
      action: "UPDATED",
      createdAt: new Date().toISOString(),
      metadata: JSON.stringify({ type: "description" }),
      user: currentUser,
      fromColumn: null,
      toColumn:   null,
      targetUser: null,
    };
    setActivities((prev) => [optimisticAct, ...prev]);

    setSaving(true);
    const result = await updateCard(card.id, { description: next });
    setSaving(false);

    if (result.success && result.card) {
      onCardUpdated(result.card);
    } else {
      setActivities((prev) => prev.filter((a) => a.id !== optimisticId));
      toast.error(result.error ?? "Failed to save");
    }
  }, [description, card.description, card.id, currentUser, onCardUpdated]);

  const handleTitleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === card.title) return;

    const optimisticId = `opt-${Date.now()}`;
    setActivities((prev) => [{
      id: optimisticId,
      action: "UPDATED",
      createdAt: new Date().toISOString(),
      metadata: JSON.stringify({ oldTitle: card.title, newTitle: trimmed }),
      user: currentUser,
      fromColumn: null,
      toColumn:   null,
      targetUser: null,
    }, ...prev]);

    setSaving(true);
    const result = await updateCard(card.id, { title: trimmed });
    setSaving(false);

    if (result.success && result.card) {
      onCardUpdated(result.card);
    } else {
      setActivities((prev) => prev.filter((a) => a.id !== optimisticId));
      setTitle(card.title);
      toast.error(result.error ?? "Failed to save");
    }
  }, [title, card.title, card.id, currentUser, onCardUpdated]);

  const saveDueDate = useCallback(async (newDateStr: string) => {
    const newDate  = newDateStr || null;
    const prevDate = fmt(card.dueDate) || null;
    if (newDate === prevDate) return;

    const optimisticId = `opt-${Date.now()}`;
    setActivities((prev) => [{
      id: optimisticId,
      action: "DUE_DATE_UPDATE",
      createdAt: new Date().toISOString(),
      metadata: JSON.stringify({ date: newDate }),
      user: currentUser,
      fromColumn: null,
      toColumn:   null,
      targetUser: null,
    }, ...prev]);

    setSaving(true);
    const result = await updateCard(card.id, { dueDate: newDate });
    setSaving(false);

    if (result.success && result.card) {
      onCardUpdated(result.card);
    } else {
      setActivities((prev) => prev.filter((a) => a.id !== optimisticId));
      setDueDate(prevDate ?? "");
      toast.error(result.error ?? "Failed to save");
    }
  }, [card.dueDate, card.id, currentUser, onCardUpdated]);

  async function handleAssigneeToggle(userId: string) {
    if (!canEdit) return;
    const add = !activeAssignees.has(userId);
    setActiveAssignees((prev) => { const n = new Set(prev); add ? n.add(userId) : n.delete(userId); return n; });
    const ok = await onAssigneeToggled(userId, add);
    if (!ok) {
      setActiveAssignees((prev) => { const n = new Set(prev); add ? n.delete(userId) : n.add(userId); return n; });
    } else {
      const member = members.find((m) => m.userId === userId);
      setActivities((prev) => [{
        id: `opt-${Date.now()}`,
        action: add ? "ASSIGNED" : "UNASSIGNED",
        createdAt: new Date().toISOString(),
        metadata: null,
        user: currentUser,
        fromColumn: null,
        toColumn:   null,
        targetUser: member ? { name: member.user.name, email: member.user.email } : { name: null, email: null },
      }, ...prev]);
    }
  }

  async function handleLabelToggle(labelId: string) {
    if (!canEdit) return;
    const add = !activeLabels.has(labelId);
    setActiveLabels((prev) => {
      const next = new Set(prev);
      add ? next.add(labelId) : next.delete(labelId);
      return next;
    });
    const ok = await onLabelToggled(labelId, add);
    if (!ok) {
      setActiveLabels((prev) => {
        const next = new Set(prev);
        add ? next.delete(labelId) : next.add(labelId);
        return next;
      });
    } else {
      const boardLabel = labels.find((l) => l.id === labelId);
      if (boardLabel) {
        setActivities((prev) => [{
          id: `opt-${Date.now()}`,
          action: add ? "LABEL_ADD" : "LABEL_REMOVE",
          createdAt: new Date().toISOString(),
          metadata: JSON.stringify({ labelName: boardLabel.name, labelColor: boardLabel.color }),
          user: currentUser,
          fromColumn: null,
          toColumn:   null,
          targetUser: null,
        }, ...prev]);
      }
    }
  }

  async function handleCreateLabel() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    const ok = await onLabelCreated(name, newColor);
    setCreating(false);
    if (ok) {
      setShowCreate(false);
      setNewName("");
      setNewColor(LABEL_COLORS[4].key);
    }
  }

  function cancelCreate() {
    setShowCreate(false);
    setNewName("");
    setNewColor(LABEL_COLORS[4].key);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100 min-w-0 overflow-hidden">

          {/* Left: flex-col so column breadcrumb and card title stack independently */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-1">

            {/* Column name — isolated flex row so truncate gets a clean bounded width */}
            <div className="flex w-full min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                  {columnTitle}
                </p>
              </div>
            </div>

            {/* Card title */}
            {canEdit ? (
              <input
                className="w-full text-lg font-semibold text-slate-900 bg-transparent outline-none border-b-2 border-transparent focus:border-primary transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void handleTitleSave()}
              />
            ) : (
              <h2 className="text-lg font-semibold text-slate-900 break-words">{card.title}</h2>
            )}
          </div>

          {/* Save / delete indicators — DialogContent renders the × close button itself */}
          <div className="flex items-center gap-2 flex-shrink-0 mr-6">
            {saving   && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
            {canEdit  && (
              deleting
                ? <Loader2 className="h-4 w-4 text-destructive animate-spin" />
                : (
                  <button
                    onClick={async () => {
                      setDeleting(true);
                      await onCardDeleted();
                      setDeleting(false);
                    }}
                    title="Delete card"
                    className="p-1 text-slate-400 hover:text-destructive transition-colors rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
            )}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto max-h-[72vh] flex flex-col">

          {/* ── Properties ──────────────────────────────────────────────── */}
          <div className="flex flex-col divide-y divide-slate-100 bg-slate-50/60 border-b border-slate-100">

            {/* Due Date */}
            <div className="flex items-center gap-0 px-6 py-2.5">
              <div className="w-28 flex items-center gap-1.5 flex-shrink-0">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Due Date</span>
              </div>
              <div className="flex-1 flex items-center gap-2">
                {canEdit ? (
                  <>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => { setDueDate(e.target.value); void saveDueDate(e.target.value); }}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {dueDate && (
                      <button
                        onClick={() => { setDueDate(""); void saveDueDate(""); }}
                        className="text-[11px] text-slate-400 hover:text-destructive transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-slate-700">{dueDate || "—"}</span>
                )}
              </div>
            </div>

            {/* Assignees */}
            <div className="flex items-start gap-0 px-6 py-2.5">
              <div className="w-28 flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Assignees</span>
              </div>
              <div className="flex-1 min-w-0">
                {canEdit ? (
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => {
                      const active = activeAssignees.has(m.userId);
                      const label  = m.user.name ?? m.user.email ?? "?";
                      const ini    = getInitials(label);
                      return (
                        <button
                          key={m.userId}
                          onClick={() => handleAssigneeToggle(m.userId)}
                          title={label}
                          className={[
                            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all border",
                            active
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${active ? "bg-primary text-white" : "bg-slate-200 text-slate-600"}`}>
                            {ini}
                          </div>
                          <span className="max-w-[100px] truncate">{label}</span>
                          {active && <Check className="h-3 w-3 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : card.assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {card.assignees.map((a) => {
                      const label = a.name ?? a.email ?? "?";
                      const ini   = getInitials(label);
                      return (
                        <span key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <div className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                            {ini}
                          </div>
                          <span className="max-w-[100px] truncate">{label}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic">—</span>
                )}
              </div>
            </div>

            {/* Labels */}
            <div className="flex items-start gap-0 px-6 py-2.5">
              <div className="w-28 flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Labels</span>
              </div>
              <div className="flex-1 min-w-0">
                {/* Label chips */}
                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {labels.map((label) => {
                      const active = activeLabels.has(label.id);
                      const lc     = getLabelColor(label.color);
                      return (
                        <button
                          key={label.id}
                          disabled={!canEdit}
                          onClick={() => handleLabelToggle(label.id)}
                          title={canEdit ? (active ? "Remove label" : "Add label") : label.name}
                          className={[
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                            active
                              ? `${lc.subtle} ${lc.text} border-transparent`
                              : "bg-white text-slate-400 border-slate-200 hover:border-slate-300",
                            canEdit ? "cursor-pointer" : "cursor-default",
                          ].join(" ")}
                        >
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${lc.bg}`} />
                          {label.name}
                          {active && <Check className="h-3 w-3 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!canEdit && labels.length === 0 && (
                  <span className="text-sm text-slate-400 italic">No labels.</span>
                )}
                {/* Create label form */}
                {canEdit && (
                  showCreate ? (
                    <div className="mt-1 space-y-2 p-2.5 bg-white rounded-lg border border-slate-200 max-w-xs">
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")  { e.preventDefault(); void handleCreateLabel(); }
                          if (e.key === "Escape") { e.preventDefault(); cancelCreate(); }
                        }}
                        placeholder="Label name…"
                        maxLength={30}
                        className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <div className="grid grid-cols-8 gap-1">
                        {LABEL_COLORS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            title={c.key}
                            onClick={() => setNewColor(c.key)}
                            className={[
                              `w-5 h-5 rounded ${c.bg} transition-transform`,
                              newColor === c.key
                                ? "ring-2 ring-offset-1 ring-slate-600 scale-110"
                                : "hover:scale-105 opacity-80 hover:opacity-100",
                            ].join(" ")}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => void handleCreateLabel()}
                          disabled={!newName.trim() || creating}
                          className="flex-1 flex items-center justify-center gap-1 text-xs bg-primary text-white py-1 rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                        </button>
                        <button
                          onClick={cancelCreate}
                          className="text-xs text-slate-500 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> New label
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ── Main content ────────────────────────────────────────────── */}
          <div className="px-6 py-5 space-y-0 flex-1">

            {/* Description */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                <AlignLeft className="h-3.5 w-3.5" /> Description
              </h3>
              {canEdit ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionSave}
                  placeholder="Add a description…"
                  rows={4}
                  className="resize-none text-sm bg-slate-50 w-full"
                />
              ) : description ? (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 rounded-lg p-3 w-full">
                  {description}
                </pre>
              ) : (
                <p className="text-sm text-slate-400 italic">No description.</p>
              )}
            </section>

            <Separator className="my-5" />

            {/* Activity */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                <Clock className="h-3.5 w-3.5" /> Activity
              </h3>
              {actLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activities.map((a) => {
                    const actor = a.user.name ?? a.user.email ?? "Someone";
                    const when  = new Date(a.createdAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    });
                    const target = a.targetUser?.name ?? a.targetUser?.email ?? "someone";
                    let desc: string;
                    switch (a.action) {
                      case "CREATED":
                        desc = "created this card"; break;
                      case "UPDATED": {
                        if (a.metadata) {
                          try {
                            const m = JSON.parse(a.metadata);
                            if (m.type === "description") { desc = "updated the description of this card"; break; }
                            if (m.oldTitle && m.newTitle) { desc = `renamed this card from "${m.oldTitle}" to "${m.newTitle}"`; break; }
                          } catch { /* */ }
                        }
                        desc = "updated this card"; break;
                      }
                      case "MOVED":
                        desc = `moved this card${a.fromColumn ? ` from "${a.fromColumn.title}"` : ""}${a.toColumn ? ` to "${a.toColumn.title}"` : ""}`; break;
                      case "ASSIGNED":
                        desc = `assigned ${target} to this card`; break;
                      case "UNASSIGNED":
                        desc = `removed ${target} from this card`; break;
                      case "DUE_DATE_UPDATE": {
                        if (a.metadata) {
                          try {
                            const { date } = JSON.parse(a.metadata);
                            if (date) {
                              desc = `set the due date to ${formatDueDate(date)}`; break;
                            }
                            desc = "removed the due date"; break;
                          } catch { /* */ }
                        }
                        desc = "updated the due date"; break;
                      }
                      case "LABEL_ADD": {
                        if (a.metadata) {
                          try { const { labelName } = JSON.parse(a.metadata); desc = `added the "${labelName}" label`; break; } catch { /* */ }
                        }
                        desc = "added a label"; break;
                      }
                      case "LABEL_REMOVE": {
                        if (a.metadata) {
                          try { const { labelName } = JSON.parse(a.metadata); desc = `removed the "${labelName}" label`; break; } catch { /* */ }
                        }
                        desc = "removed a label"; break;
                      }
                      default:
                        desc = a.action.toLowerCase() + " this card";
                    }
                    return (
                      <li key={a.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5">
                          {getInitials(actor)}
                        </div>
                        <div className="flex-1 min-w-0 text-sm leading-snug">
                          <span className="font-medium text-slate-800">{actor}</span>
                          <span className="text-slate-500"> {desc}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{when}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
