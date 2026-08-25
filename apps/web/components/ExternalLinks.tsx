"use client";

import { useEffect } from "react";

/**
 * Guarantees every off-site link opens in a new tab.
 *
 * Most anchors already carry `target="_blank"` explicitly, but this is the
 * backstop: it runs once after mount, and again whenever the DOM gains new
 * anchors, so a link added later cannot quietly navigate the visitor away from
 * a page they have progress on.
 *
 * In-page anchors (`#vault`) and `mailto:` / `tel:` are deliberately excluded —
 * a new tab for those is a bug, not a courtesy.
 */
export function ExternalLinks() {
  useEffect(() => {
    const origin = window.location.origin;

    const mark = (root: ParentNode) => {
      for (const a of Array.from(root.querySelectorAll?.("a[href]") ?? [])) {
        const el = a as HTMLAnchorElement;
        const href = el.getAttribute("href") ?? "";

        if (href.startsWith("#")) continue;
        if (/^(mailto:|tel:|sms:)/i.test(href)) continue;

        // Same-origin links stay in place; only genuinely external ones open out.
        let external = /^https?:\/\//i.test(href);
        if (external) {
          try {
            external = new URL(href, origin).origin !== origin;
          } catch {
            external = false;
          }
        }
        if (!external) continue;

        el.target = "_blank";
        // noopener is the security half; noreferrer keeps the referrer private.
        const rel = new Set((el.rel || "").split(/\s+/).filter(Boolean));
        rel.add("noopener");
        rel.add("noreferrer");
        el.rel = [...rel].join(" ");
      }
    };

    mark(document);

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        for (const node of Array.from(r.addedNodes)) {
          if (node.nodeType === 1) mark(node as Element);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => mo.disconnect();
  }, []);

  return null;
}
