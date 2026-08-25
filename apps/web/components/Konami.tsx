"use client";

import { useEffect, useRef } from "react";
import { useFoundry } from "@/lib/store";

const CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

/** The one secret worth keeping. Awards its achievement and inverts the stock. */
export function Konami() {
  const unlock = useFoundry((st) => st.unlock);
  const toggleTheme = useFoundry((st) => st.toggleTheme);
  const pos = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const want = CODE[pos.current];
      const got = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (got === want) {
        pos.current++;
        if (pos.current === CODE.length) {
          pos.current = 0;
          unlock("konami");
          toggleTheme();
        }
      } else {
        pos.current = got === CODE[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlock, toggleTheme]);

  return null;
}
