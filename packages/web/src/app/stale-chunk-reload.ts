// Depois de um deploy, uma aba aberta com a versão anterior tenta carregar chunks lazy
// que já não existem no servidor, e a navegação cai no ErrorBoundary. O Vite avisa essa
// falha com o evento "vite:preloadError"; recarregar a página busca a versão nova.

const LAST_RELOAD_KEY = "investpro-stale-chunk-reload-at";
/** Se a falha se repetir logo após recarregar, o problema não é versão antiga: deixa o erro aparecer. */
const RELOAD_COOLDOWN_MS = 10_000;

function readLastReload(): number {
  try {
    return Number(sessionStorage.getItem(LAST_RELOAD_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Retorna false quando não dá para gravar: sem esse registro não há como impedir um loop de recarga. */
function writeLastReload(timestamp: number): boolean {
  try {
    sessionStorage.setItem(LAST_RELOAD_KEY, String(timestamp));
    return true;
  } catch {
    return false;
  }
}

export function handleStaleChunk(
  event: Event,
  reload: () => void = () => window.location.reload(),
  now: number = Date.now(),
) {
  if (now - readLastReload() < RELOAD_COOLDOWN_MS) return;
  if (!writeLastReload(now)) return;
  event.preventDefault();
  reload();
}

export function registerStaleChunkReload() {
  window.addEventListener("vite:preloadError", (event) =>
    handleStaleChunk(event),
  );
}
