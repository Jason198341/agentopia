import type { Terrain, BattleResult } from '@/types/sangokji';

// Defense multiplier per terrain (mountains are impassable, handled upstream)
const DEFENSE_BONUS: Record<Terrain, number> = {
  plain:    1.0,
  forest:   1.3,
  mountain: 2.0, // shouldn't be reached, but safe fallback
};

/**
 * Resolve a battle between an attacker and a defender.
 *
 * Algorithm:
 * 1. Effective defender strength = defenderTroops × terrainBonus
 * 2. Both sides get a ±20% random factor
 * 3. Higher effective strength wins
 * 4. Winner loses 10–30% of their troops; loser loses 50–80%
 */
export function resolveBattle(
  attackerTroops: number,
  defenderTroops: number,
  defenderTerrain: Terrain
): BattleResult {
  const defBonus = DEFENSE_BONUS[defenderTerrain];

  const atkStrength = attackerTroops * randomFactor();
  const defStrength = defenderTroops * defBonus * randomFactor();

  if (atkStrength > defStrength) {
    // Attacker wins
    const attackerLoss = Math.ceil(attackerTroops * randomRange(0.10, 0.30));
    const defenderLoss = defenderTroops; // all lost
    return { winner: 'attacker', attackerLoss, defenderLoss };
  } else {
    // Defender wins
    const defenderLoss = Math.ceil(defenderTroops * randomRange(0.10, 0.25));
    const attackerLoss = attackerTroops; // all lost
    return { winner: 'defender', attackerLoss, defenderLoss };
  }
}

function randomFactor(): number {
  return 0.8 + Math.random() * 0.4; // 0.8 ~ 1.2 (±20%)
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
