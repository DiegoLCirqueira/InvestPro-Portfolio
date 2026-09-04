interface AuthMarketingPanelProps {
  alt: string;
}

export function AuthMarketingPanel({ alt }: AuthMarketingPanelProps) {
  return (
    <div className="hidden nav:flex items-center justify-center bg-[#081a15] border-r border-border overflow-hidden">
      <img
        src="/foto_login.png"
        alt={alt}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
