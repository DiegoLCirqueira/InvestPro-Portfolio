import { cn } from "@/lib/utils";

export const bottomNavItemClassName = (isActive: boolean) =>
  cn(
    "flex h-[var(--bottom-nav-height)] flex-1 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors",
    isActive ? "text-primary" : "text-muted-foreground",
  );
