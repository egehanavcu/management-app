import type { DndColumn } from "@/types/dnd";

/**
 * Shown inside DragOverlay while a column is being dragged.
 * Mirrors the column's visual structure with a "lifted" transform.
 */
export function ColumnOverlay({ column }: { column: DndColumn }) {
  return (
    <div
      className="w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-100 shadow-2xl rotate-1 scale-[1.03] opacity-95 pointer-events-none"
      style={{ maxHeight: "70vh" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200/60">
        <div className="w-3.5 h-3.5 text-slate-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-800 truncate flex-1">{column.title}</h3>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
          {column.cards.length}
        </span>
      </div>

      {/* Cards preview — first 5 cards, simplified */}
      <div className="flex-1 overflow-hidden px-2 py-2 space-y-1.5">
        {column.cards.slice(0, 5).map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-lg px-3 py-2 text-sm text-slate-700 truncate shadow-sm"
          >
            {card.title}
          </div>
        ))}
        {column.cards.length > 5 && (
          <p className="text-[11px] text-slate-400 px-2">
            +{column.cards.length - 5} more
          </p>
        )}
      </div>
    </div>
  );
}
