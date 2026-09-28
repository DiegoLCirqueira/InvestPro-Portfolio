// Com "reduzir movimento" ligado no sistema, rolagens programáticas pulam direto (sem animação).
export function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
