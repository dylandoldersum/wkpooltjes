"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Detect link clicks to internal pages and start the progress bar
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return; // links + middle/right click ignored
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // cmd+click etc.
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target === "_blank") return;
      // Only intercept same-origin links
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }
      setLoading(true);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Detect form submissions (server actions)
  useEffect(() => {
    function onSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      setLoading(true);
    }
    document.addEventListener("submit", onSubmit);
    return () => document.removeEventListener("submit", onSubmit);
  }, []);

  // Hide once navigation finished (route changed)
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  if (!loading) return null;

  return (
    <div
      className="fixed left-0 top-0 z-50 h-0.5 w-full overflow-hidden bg-transparent"
      aria-hidden="true"
    >
      <div className="h-full origin-left animate-[progress_2.4s_ease-out_forwards] bg-gradient-to-r from-oranje-500 via-oranje-600 to-oranje-500" />
    </div>
  );
}
