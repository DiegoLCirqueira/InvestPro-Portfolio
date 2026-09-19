import {
  MENU_MIN_HEIGHT_PX,
  MENU_SIDE_OFFSET_PX,
  MENU_VIEWPORT_MARGIN_PX,
} from "@/components/ui/popover";

// O menu sempre abre embaixo do gatilho. Se sobrar menos espaço que o mínimo
// útil, rola o container da página para dar espaço em vez de inverter o menu.
export function ensureRoomBelow(anchor: HTMLElement | null) {
  if (!anchor) return;
  const roomBelow =
    window.innerHeight -
    anchor.getBoundingClientRect().bottom -
    MENU_SIDE_OFFSET_PX -
    MENU_VIEWPORT_MARGIN_PX;
  if (roomBelow < MENU_MIN_HEIGHT_PX) anchor.scrollIntoView({ block: "center" });
}
