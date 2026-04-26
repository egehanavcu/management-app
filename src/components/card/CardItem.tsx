import type { DndCard } from "@/types/dnd";

const LABEL_COLORS: Record<string, string> = {
  red: "bg-red-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  green: "bg-emerald-400",
  blue: "bg-blue-400",
  purple: "bg-purple-400",
  pink: "bg-pink-400",
  teal: "bg-teal-400",
};

function labelColor(color: string) {
  return LABEL_COLORS[color.toLowerCase()] ?? "bg-slate-400";
}

export function CardItem({ card }: { card: DndCard }) {
  const hasLabels = card.labels.length > 0;
  const hasAssignee = card.assignedUser !== null;
  const hasDueDate = card.dueDate !== null;

  const initials = card.assignedUser
    ? (card.assignedUser.name ?? card.assignedUser.email ?? "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const isOverdue = hasDueDate && new Date(card.dueDate!) < new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm px-3 py-2.5 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-150 select-none">
      {/* Label colour strips */}
      {hasLabels && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map(({ label }) => (
            <span
              key={label.id}
              title={label.name}
              className={`inline-block h-1.5 w-8 rounded-full ${labelColor(label.color)}`}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm text-slate-800 leading-snug font-medium">{card.title}</p>

      {/* Footer */}
      {(hasDueDate || hasAssignee) && (
        <div className="flex items-center justify-between mt-2.5 gap-2">
          {hasDueDate ? (
            <span
              className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                isOverdue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {new Date(card.dueDate!).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : (
            <span />
          )}

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
