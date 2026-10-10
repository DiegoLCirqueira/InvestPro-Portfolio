// "Reduzir movimento" ligado no sistema: animações e rolagens por código ficam desligadas.
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Com movimento reduzido, rolagens programáticas pulam direto (sem animação).
export function preferredScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
