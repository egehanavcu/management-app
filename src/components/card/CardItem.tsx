import { AlignLeft, Calendar } from "lucide-react";
import { getLabelColor } from "@/lib/label-colors";
import type { DndCard } from "@/types/dnd";

interface CardItemProps {
  card: DndCard;
  onClick?: () => void;
}

export function CardItem({ card, onClick }: CardItemProps) {
  const hasLabels   = card.labels.length > 0;
  const hasAssignee = card.assignedUser !== null;
  const hasDueDate  = card.dueDate !== null;
  const hasDesc     = Boolean(card.description?.trim());
  const isOverdue   = hasDueDate && new Date(card.dueDate!) < new Date();

  const initials = card.assignedUser
    ? (card.assignedUser.name ?? card.assignedUser.email ?? "?")
        .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="bg-white rounded-lg shadow-sm px-3 py-2.5 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-150 select-none cursor-pointer group"
    >
      {/* Label colour strips — thin, bright, non-intrusive */}
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
      {(hasDueDate || hasDesc || hasAssignee) && (
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

          {hasAssignee && (
            <div
              title={card.assignedUser!.name ?? card.assignedUser!.email ?? "Assignee"}
              className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
            >
              {initials}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
