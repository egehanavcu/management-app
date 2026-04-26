/**
 * Calculates a fractional position for a card being inserted at `insertIndex`
 * among `siblings` (the other cards in the target column, excluding the card
 * being moved).
 *
 * Strategy:
 *  - Top of column:  newPos = siblings[0].position / 2
 *  - Bottom:         newPos = siblings[last].position + 1024
 *  - Middle:         newPos = (prev.position + next.position) / 2
 *
 * The +1024 gap ensures plenty of room for future inserts without rebalancing.
 */
export function calculateNewPosition(
  siblings: { position: number }[],
  insertIndex: number
): number {
  const prev = siblings[insertIndex - 1];
  const next = siblings[insertIndex];

  if (!prev && !next) return 1024;
  if (!prev) return next.position / 2;
  if (!next) return prev.position + 1024;

  return (prev.position + next.position) / 2;
}
