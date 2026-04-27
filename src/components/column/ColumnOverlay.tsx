import { GripVertical } from "lucide-react";
import { CardItem } from "@/components/card/CardItem";
import type { DndColumn } from "@/types/dnd";

/**
 * High-fidelity clone of Column rendered inside DragOverlay while dragging.
 * Uses CardItem directly so labels, assignees, description icons, and due
 * dates are all identical to the real board. Interactive/dnd layers are
 * intentionally omitted — pointer-events-none on the wrapper handles this.
 */
export function ColumnOverlay({ column }: { column: DndColumn }) {
  return (
    <div
      className={[
        "w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-100",
        "shadow-2xl pointer-events-none select-none",
        "scale-[1.03] rotate-2 opacity-[0.97]",
      ].join(" ")}
      style={{ maxHeight: "72vh" }}
    >
      {/* ── Header — mirrors Column exactly ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-2 py-2 flex-shrink-0 rounded-t-xl">
        <GripVertical className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-slate-800 truncate flex-1">
          {column.title}
        </h3>
        <span className="flex-shrink-0 text-[11px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">
          {column.cards.length}
        </span>
      </div>

      {/* ── Cards — full CardItem fidelity, capped to viewport height ───────── */}
      <div className="flex-1 overflow-hidden px-2 pb-2">
        <div className="space-y-2">
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
