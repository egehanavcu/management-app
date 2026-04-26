"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

type Activity = {
  id: string;
  action: string;
  createdAt: string;
  user:       { name: string | null; email: string | null };
  card:       { title: string };
  fromColumn: { title: string } | null;
  toColumn:   { title: string } | null;
};

export function BoardActivityPanel({
  boardId,
  onClose,
}: {
  boardId: string;
  onClose: () => void;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/boards/${boardId}/activity`)
      .then((r) => r.json())
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [boardId]);

  return (
    <div className="w-80 flex-shrink-0 bg-white/95 backdrop-blur-sm border-l border-white/20 flex flex-col h-full shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Board Activity</h2>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 pt-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-slate-400 italic pt-4">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-4">
            {activities.map((a) => {
              const actor = a.user.name ?? a.user.email ?? "Someone";
              const when  = new Date(a.createdAt).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              });
              const desc =
                a.action === "MOVED"
                  ? `moved "${a.card.title}"${a.fromColumn ? ` from "${a.fromColumn.title}"` : ""}${a.toColumn ? ` to "${a.toColumn.title}"` : ""}`
                  : `${a.action.toLowerCase()} "${a.card.title}"`;
              return (
                <li key={a.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5">
                    {actor.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-sm leading-snug">
                    <span className="font-medium text-slate-800">{actor}</span>{" "}
                    <span className="text-slate-500">{desc}</span>
                    <br />
                    <span className="text-[11px] text-slate-400">{when}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
