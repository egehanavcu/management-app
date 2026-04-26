import { CardItem } from "./CardItem";
import type { DndCard } from "@/types/dnd";

/**
 * The card shown inside DragOverlay — appears "lifted" with shadow and
 * a subtle rotation to communicate it's being dragged.
 */
export function CardOverlay({ card }: { card: DndCard }) {
  return (
    <div
      className="rotate-2 scale-105 shadow-2xl opacity-95 pointer-events-none"
      style={{ width: "18rem" }}
    >
      <CardItem card={card} />
    </div>
  );
}
