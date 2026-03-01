const DAILY_LIMIT = 1;

export function checkDailyLimit(featureKey: string): { allowed: boolean; remaining: number; resetAt: string } {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `agentopia_rate_${featureKey}_${today}`;
  const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
  return {
    allowed: count < DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - count),
    resetAt: `${today}T24:00:00`,
  };
}

export function incrementDailyCount(featureKey: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `agentopia_rate_${featureKey}_${today}`;
  const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
  localStorage.setItem(storageKey, String(count + 1));
  // Clean old keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('agentopia_rate_') && !key.includes(today)) {
      localStorage.removeItem(key);
    }
  }
}
