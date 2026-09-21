/**
 * Roda `task` com exclusão mútua entre TODAS as abas da mesma origem (Web Locks): abas que
 * recarregam juntas renovam a sessão uma por vez, e cada uma já usa o cookie que a anterior
 * acabou de receber. Sem a API (navegador antigo) ou sem permissão, roda direto: a exclusão
 * é uma proteção a mais, nunca uma condição para funcionar.
 */
export async function runExclusiveAcrossTabs<T>(lockName: string, task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks?.request) return task();

  try {
    return await locks.request(lockName, task);
  } catch (error) {
    // Contexto sem acesso a locks (ex.: origem opaca): segue sem exclusão.
    if (error instanceof DOMException && error.name === "SecurityError") return task();
    throw error;
  }
}
