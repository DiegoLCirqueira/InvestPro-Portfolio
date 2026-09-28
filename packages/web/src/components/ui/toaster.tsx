import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { BELOW_NAV_QUERY, useMediaQuery } from "@/hooks/use-media-query";

function useDocumentTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light",
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

// Abaixo do breakpoint `nav` existe a barra de navegação inferior, fixa: o toast sobe acima dela.
const ABOVE_BOTTOM_NAV = {
  bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 0.75rem)",
};

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useDocumentTheme();
  const isBottomNavVisible = useMediaQuery(BELOW_NAV_QUERY);
  // O Sonner usa `mobileOffset` até 600 px e `offset` acima disso: os dois cobrem a faixa da barra.
  const offset = isBottomNavVisible ? ABOVE_BOTTOM_NAV : undefined;

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      offset={offset}
      mobileOffset={offset}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-1 group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg rounded-xl",
          description: "group-[.toast]:text-muted",
          actionButton:
            "group-[.toast]:bg-primary-solid group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
