import { AlignLeft, Calendar } from "lucide-react";
import { getLabelColor } from "@/lib/label-colors";
import { getInitials } from "@/lib/utils";
import type { DndCard } from "@/types/dnd";

interface CardItemProps {
  card: DndCard;
  onClick?: () => void;
}

export function CardItem({ card, onClick }: CardItemProps) {
  const hasLabels    = card.labels.length > 0;
  const hasAssignees = card.assignees.length > 0;
  const hasDueDate   = card.dueDate !== null;
  const hasDesc      = Boolean(card.description?.trim());
  const isOverdue    = hasDueDate && new Date(card.dueDate!) < new Date();

  const visibleAssignees = card.assignees.slice(0, 3);
  const overflow         = card.assignees.length - 3;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="bg-white rounded-lg shadow-sm px-3 py-2.5 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-150 select-none cursor-pointer group"
    >
      {/* Label colour strips */}
      {hasLabels && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map(({ label }) => (
            <span
              key={label.id}
              title={label.name}
              className={`inline-block h-2 w-10 rounded-sm flex-shrink-0 ${getLabelColor(label.color).bg}`}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm text-slate-800 leading-snug font-medium">{card.title}</p>

      {/* Footer badges */}
      {(hasDueDate || hasDesc || hasAssignees) && (
        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center gap-1.5">
            {hasDueDate && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                  isOverdue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {new Date(card.dueDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {hasDesc && (
              <span className="text-slate-400" title="Has description">
                <AlignLeft className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          {/* Assignee avatar group — max 3 + overflow count */}
          {hasAssignees && (
            <div className="flex items-center gap-x-0.5 flex-shrink-0">
              {visibleAssignees.map((a) => (
                <div
                  key={a.id}
                  title={a.name ?? a.email ?? "Assignee"}
                  className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-semibold"
                >
                  {getInitials(a.name ?? a.email)}
                </div>
              ))}
              {overflow > 0 && (
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-semibold">
                  +{overflow}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
