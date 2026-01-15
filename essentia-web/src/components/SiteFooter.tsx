"use client";

import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <footer className="siteFooterGlobal">
      © 2026 ESSENTIA | All Rights Reserved Made with ❤️ by{" "}
      <a href="https://aidengoldkr.dev" rel="noreferrer">
        @aidengoldkr
      </a>
    </footer>
  );
}
