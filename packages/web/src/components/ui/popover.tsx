import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

export const MENU_SIDE_OFFSET_PX = 4;
export const MENU_VIEWPORT_MARGIN_PX = 8;
export const MENU_MAX_HEIGHT_PX = 320;
// Altura mínima útil: ~4 opções. Abaixo disso o menu não vale a pena.
export const MENU_MIN_HEIGHT_PX = 176;

const MENU_HEIGHT_STYLE: React.CSSProperties = {
  maxHeight: `max(min(var(--radix-popover-content-available-height), ${MENU_MAX_HEIGHT_PX}px), ${MENU_MIN_HEIGHT_PX}px)`,
};

const Popover = PopoverPrimitive.Root;

const PopoverAnchor = PopoverPrimitive.Anchor;

// Único lugar que decide onde um menu abre em relação ao gatilho: SEMPRE
// embaixo dele (sem inverter por colisão, para nunca cobrir o campo de cima),
// com a largura do gatilho e altura limitada ao espaço disponível, rolando por
// dentro. Quem abre o menu rola a página antes se faltar espaço (ver
// ensureRoomBelow). Vai por portal para o <body>, então nenhum container com
// overflow o corta.
const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, style, sideOffset = MENU_SIDE_OFFSET_PX, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      side="bottom"
      align="start"
      sideOffset={sideOffset}
      collisionPadding={MENU_VIEWPORT_MARGIN_PX}
      avoidCollisions={false}
      hideWhenDetached
      style={{ ...MENU_HEIGHT_STYLE, ...style }}
      className={cn(
        "z-50 w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-xl border border-border bg-surface-1 p-1 text-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverAnchor, PopoverContent };
