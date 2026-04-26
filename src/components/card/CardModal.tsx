"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { X, Calendar, AlignLeft, Tag, User, Clock, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateCard, toggleCardLabel } from "@/lib/actions";
import type { DndCard, DndBoardMember, BoardLabel } from "@/types/dnd";

const LABEL_BG: Record<string, string> = {
  red: "bg-red-400", orange: "bg-orange-400", yellow: "bg-yellow-400",
  green: "bg-emerald-400", blue: "bg-blue-400", purple: "bg-purple-400",
  pink: "bg-pink-400", teal: "bg-teal-400",
};
function labelBg(c: string) { return LABEL_BG[c.toLowerCase()] ?? "bg-slate-400"; }

function fmt(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

type Activity = {
  id: string;
  action: string;
  createdAt: string;
  user: { name: string | null; email: string | null };
  fromColumn: { title: string } | null;
  toColumn:   { title: string } | null;
};

interface CardModalProps {
  card: DndCard;
  columnTitle: string;
  boardId: string;
  members: DndBoardMember[];
  labels: BoardLabel[];
  canEdit: boolean;
  onClose: () => void;
  onCardUpdated: (card: DndCard) => void;
}

export function CardModal({ card, columnTitle, boardId, members, labels, canEdit, onClose, onCardUpdated }: CardModalProps) {
  // Local form state — mirrors card, updated optimistically
  const [title,          setTitle]          = useState(card.title);
  const [description,    setDescription]    = useState(card.description ?? "");
  const [dueDate,        setDueDate]        = useState(fmt(card.dueDate));
  const [assignedUserId, setAssignedUserId] = useState(card.assignedUser?.id ?? "");
  const [activeLabels,   setActiveLabels]   = useState<Set<string>>(
    new Set(card.labels.map((l) => l.label.id))
  );

  const [activities, setActivities]  = useState<Activity[]>([]);
  const [actLoading, setActLoading]  = useState(true);
  const [saving,     setSaving]      = useState(false);
  const [, startTransition]          = useTransition();

  // Fetch activity on open
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

  function handleLabelToggle(labelId: string) {
    if (!canEdit) return;
    const add = !activeLabels.has(labelId);
    setActiveLabels((prev) => {
      const next = new Set(prev);
      add ? next.add(labelId) : next.delete(labelId);
      return next;
    });
    startTransition(async () => {
      const r = await toggleCardLabel(card.id, labelId, add, boardId);
      if (!r.success) {
        toast.error(r.error ?? "Failed to update label");
        setActiveLabels((prev) => {
          const next = new Set(prev);
          add ? next.delete(labelId) : next.add(labelId);
          return next;
        });
      }
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {columnTitle}
            </p>
            {canEdit ? (
              <input
                className="w-full text-lg font-semibold text-slate-900 bg-transparent outline-none border-b-2 border-transparent focus:border-primary transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() && title !== card.title && save({ title: title.trim() })}
              />
            ) : (
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            )}
          </div>
          {saving && <Loader2 className="h-4 w-4 text-slate-400 animate-spin flex-shrink-0 mt-1" />}
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-0 overflow-y-auto max-h-[70vh]">
          {/* Main: description + activity */}
          <div className="flex-1 min-w-0 px-6 py-4 space-y-6">

            {/* Description */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                <AlignLeft className="h-3.5 w-3.5" /> Description
              </h3>
              {canEdit ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => save({ description: description || null })}
                  placeholder="Add a description (Markdown supported)…"
                  rows={4}
                  className="resize-none text-sm bg-slate-50"
                />
              ) : description ? (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 rounded-lg p-3">
                  {description}
                </pre>
              ) : (
                <p className="text-sm text-slate-400 italic">No description.</p>
              )}
            </section>

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
                    const desc =
                      a.action === "MOVED"
                        ? `moved this card${a.fromColumn ? ` from "${a.fromColumn.title}"` : ""}${a.toColumn ? ` to "${a.toColumn.title}"` : ""}`
                        : a.action.toLowerCase() + " this card";
                    return (
                      <li key={a.id} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5">
                          {actor.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-sm leading-snug">
                          <span className="font-medium text-slate-800">{actor}</span>
                          <span className="text-slate-500"> {desc}</span>
                          <br />
                          <span className="text-[11px] text-slate-400">{when}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Sidebar: due date, assignee, labels */}
          <div className="w-52 flex-shrink-0 border-l border-slate-100 px-4 py-4 space-y-5 bg-slate-50/50">

            {/* Due date */}
            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <Calendar className="h-3 w-3" /> Due Date
              </h3>
              {canEdit ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    save({ dueDate: e.target.value || null });
                  }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <p className="text-sm text-slate-700">{dueDate || "—"}</p>
              )}
              {dueDate && canEdit && (
                <button
                  onClick={() => { setDueDate(""); save({ dueDate: null }); }}
                  className="mt-1 text-[11px] text-slate-400 hover:text-destructive transition-colors"
                >
                  Clear
                </button>
              )}
            </section>

            {/* Assignee */}
            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <User className="h-3 w-3" /> Assignee
              </h3>
              {canEdit ? (
                <select
                  value={assignedUserId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignedUserId(val);
                    save({ assignedUserId: val || null });
                  }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name ?? m.user.email}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-700">
                  {card.assignedUser
                    ? (card.assignedUser.name ?? card.assignedUser.email)
                    : "—"}
                </p>
              )}
            </section>

            {/* Labels */}
            {labels.length > 0 && (
              <section>
                <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  <Tag className="h-3 w-3" /> Labels
                </h3>
                <div className="space-y-1.5">
                  {labels.map((label) => {
                    const active = activeLabels.has(label.id);
                    return (
                      <button
                        key={label.id}
                        disabled={!canEdit}
                        onClick={() => handleLabelToggle(label.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          active ? "ring-2 ring-offset-1 ring-slate-400" : "opacity-70 hover:opacity-100"
                        } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${labelBg(label.color)}`} />
                        <span className="truncate text-slate-700">{label.name}</span>
                        {active && <Check className="h-3 w-3 ml-auto text-slate-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
