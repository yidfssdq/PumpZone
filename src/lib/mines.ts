// Mines game utility functions

/**
 * Calculate the multiplier for revealing `n` safe tiles 
 * on a grid of `totalTiles` with `mineCount` mines.
 * 
 * Uses the combinatorial formula:
 * multiplier = (0.99) * C(totalTiles, n) / C(totalTiles - mineCount, n)
 * 
 * The 0.99 factor represents the 1% house edge (49.99% effective winrate).
 */
export function calculateMultiplier(
  safeTilesRevealed: number,
  mineCount: number,
  totalTiles: number = 25
): number {
  if (safeTilesRevealed === 0) return 1;
  
  const houseEdge = 0.99; // 1% house edge
  let multiplier = houseEdge;
  
  for (let i = 0; i < safeTilesRevealed; i++) {
    multiplier *= (totalTiles - i) / (totalTiles - mineCount - i);
  }
  
  return Math.max(1, parseFloat(multiplier.toFixed(2)));
}

/**
 * Generate random mine positions
 */
export function generateMinePositions(
  mineCount: number,
  totalTiles: number = 25,
  excludeIndex?: number
): Set<number> {
  const mines = new Set<number>();
  while (mines.size < mineCount) {
    const pos = Math.floor(Math.random() * totalTiles);
    if (pos !== excludeIndex) {
      mines.add(pos);
    }
  }
  return mines;
}

/**
 * Get the next multiplier (preview what clicking another tile would give)
 */
export function getNextMultiplier(
  currentRevealed: number,
  mineCount: number,
  totalTiles: number = 25
): number {
  return calculateMultiplier(currentRevealed + 1, mineCount, totalTiles);
}

/**
 * Get all multiplier levels for display
 */
export function getMultiplierTable(
  mineCount: number,
  totalTiles: number = 25,
  maxRows: number = 10
): { tiles: number; multiplier: number }[] {
  const safeTiles = totalTiles - mineCount;
  const rows = Math.min(safeTiles, maxRows);
  const table: { tiles: number; multiplier: number }[] = [];
  
  for (let i = 1; i <= rows; i++) {
    table.push({
      tiles: i,
      multiplier: calculateMultiplier(i, mineCount, totalTiles),
    });
  }
  
  return table;
}
