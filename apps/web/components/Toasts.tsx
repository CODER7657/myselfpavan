"use client";

import { useEffect } from "react";
import { useFoundry } from "@/lib/store";
import k from "./Toasts.module.css";

/** Each toast dismisses itself; this is the timer for one of them. */
function Toast({ id, children }: { id: string; children: React.ReactNode }) {
  const dismiss = useFoundry((st) => st.dismissToast);

  useEffect(() => {
    const t = setTimeout(() => dismiss(id), 4600);
    return () => clearTimeout(t);
  }, [id, dismiss]);

  return (
    <li className={k.toast}>
      <button type="button" className={k.close} onClick={() => dismiss(id)} aria-label="Dismiss">
        ×
      </button>
      {children}
    </li>
  );
}

export function Toasts() {
  const toasts = useFoundry((st) => st.toasts);

  return (
    <ul className={k.stack} aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <Toast key={t.id} id={t.id}>
          <span className={k.kind} data-kind={t.kind}>
            {t.kind === "achievement" ? "ACHIEVEMENT" : "UNLOCKED"}
          </span>
          <span className={k.title}>{t.title}</span>
          <span className={k.detail}>{t.detail}</span>
          {t.xp != null && <span className={k.xp}>+{t.xp} XP</span>}
        </Toast>
      ))}
    </ul>
  );
}
