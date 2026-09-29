import { BrandMark } from "@/components/BrandMark";
import { CONTACT_EMAIL, CONTACT_MAILTO, DEMO_NOTICE_SHORT } from "@/lib/company";
import { cn } from "@/lib/utils";
import { LANDING_CONTAINER } from "@/components/landing/layout";

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div
        className={cn(
          LANDING_CONTAINER,
          "flex flex-col gap-3 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <p className="flex items-center gap-2.5">
          <BrandMark className="size-5" />
          <span>
            <strong className="font-semibold text-foreground">InvestPro</strong> ©{" "}
            {new Date().getFullYear()} · {DEMO_NOTICE_SHORT}
          </span>
        </p>
        <a
          href={CONTACT_MAILTO}
          className="inline-flex min-h-11 items-center self-start rounded-lg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
        >
          {CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
