"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { agents } from "@foundry/content";
import { levelProgress, useFoundry } from "@/lib/store";
import { armSound, armTaps } from "@/lib/sound";
import { watchVisibility } from "@/lib/music";
import { Sigil } from "./Sigil";
import s from "./Hud.module.css";

const NAV = [
  { href: "#dossier", label: "About" },
  { href: "#console", label: "Console" },
  { href: "#vault", label: "Work" },
  { href: "#tree", label: "Skills" },
  { href: "#log", label: "Education" },
  { href: "#assay", label: "Assay" },
  { href: "#shell", label: "Terminal" },
  { href: "#signal", label: "Contact" },
];

/**
 * The persistent operator HUD: level, XP toward the next tier, recruited roster
 * and the stock toggle. Below the wide breakpoint the section links collapse
 * into a drawer, because a seven-item nav and an XP meter cannot share a
 * phone's width without one of them becoming unreadable.
 */
export function Hud() {
  const xp = useFoundry((st) => st.xp);
  const recruited = useFoundry((st) => st.recruited);
  const theme = useFoundry((st) => st.theme);
  const toggleTheme = useFoundry((st) => st.toggleTheme);
  const syncTheme = useFoundry((st) => st.syncTheme);
  const music = useFoundry((st) => st.music);
  const toggleMusic = useFoundry((st) => st.toggleMusic);

  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
    armSound();
    const painted = document.documentElement.dataset.theme;
    if (painted === "light" || painted === "dark") syncTheme(painted);

    /* One listener for every button on the page, reading the mute flag at the
       moment of the press rather than closing over it. */
    /* There is no mute control any more, so nothing to consult: the click
       and the event cues always play. */
    const stopTaps = armTaps(() => false);
    const stopWatching = watchVisibility();

    return () => {
      stopTaps();
      stopWatching();
    };
  }, [syncTheme]);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  /* Escape closes, and the page beneath must not scroll while the drawer is up. */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const { level, into, span, pct } = levelProgress(hydrated ? xp : 0);

  return (
    <>
      <header className={s.hud}>
        <div className={`wrap ${s.inner}`}>
          <a href="#top" className={`${s.mark} pixel`} aria-label="PAVAN//FOUNDRY, back to top">
            PAVAN<span>//</span>FOUNDRY
          </a>

          <nav className={s.nav} aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>

          <div className={s.right}>
            <div className={s.roster} aria-label="Recruited operatives">
              {agents.map((a) => {
                const on = hydrated && recruited.includes(a.id);
                return (
                  <span
                    key={a.id}
                    className={s.slot}
                    data-on={on}
                    style={{ color: a.color }}
                    title={on ? a.callsign : "Not recruited"}
                  >
                    <Sigil matrix={a.sigil} size={2} gap={1} />
                  </span>
                );
              })}
            </div>

            <div className={s.xp}>
              <div className={s.xpTop}>
                <span className={s.lvl}>LVL {level}</span>
                <span className={s.xpNum} suppressHydrationWarning>
                  {into}/{span}
                </span>
              </div>
              <div className={s.track}>
                <div className={s.fill} style={{ width: pct + "%" }} />
              </div>
            </div>

            {/* The three toggles travel together and share a tighter gap:
                adding the third pushed the row past the header's own width,
                where overflow-x: clip made it unclickable. */}
            <div className={s.controls}>
            <button
              type="button"
              className={s.iconBtn}
              onClick={toggleTheme}
              aria-label={"Switch to " + (theme === "dark" ? "light" : "dark") + " stock"}
              title="Toggle stock"
            >
              {hydrated && theme === "dark" ? "\u263e" : "\u2600"}
            </button>

            {/* Music is a separate decision from the event cues: one is a
                texture you opt into, the other is feedback on your own
                actions. Off until asked for. */}
            <button
              type="button"
              className={s.iconBtn}
              onClick={toggleMusic}
              aria-label={(hydrated && music ? "Stop" : "Play") + " background music"}
              aria-pressed={hydrated ? music : false}
              title="Background music"
              data-on={hydrated && music}
            >
              {"♫"}
            </button>
            </div>

            <button
              ref={toggleRef}
              type="button"
              className={s.burger}
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="hud-drawer"
              data-open={open}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Rendered unconditionally so both the open and close transitions run. */}
      <div className={s.scrim} data-open={open} onClick={close} aria-hidden="true" />

      <div
        id="hud-drawer"
        ref={panelRef}
        className={s.drawer}
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label="Sections"
        tabIndex={-1}
      >
        <div className={s.drawerHead}>
          <span className="micro dim">NAVIGATE</span>
          <button type="button" className={s.close} onClick={close} aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className={s.drawerNav}>
          {NAV.map((n, i) => (
            <a key={n.href} href={n.href} onClick={close} tabIndex={open ? 0 : -1}>
              <span className={s.drawerNum}>{String(i + 1).padStart(2, "0")}</span>
              {n.label}
            </a>
          ))}
        </nav>

        {/* On a phone the header has room for the wordmark, the music button
            and the burger — nothing else. The rest of the controls live in
            here, where there is space to label them. */}
        <div className={s.drawerControls}>
          <button
            type="button"
            className={s.drawerControl}
            onClick={toggleTheme}
            tabIndex={open ? 0 : -1}
          >
            <span>{hydrated && theme === "dark" ? "☾" : "☀"}</span>
            {hydrated && theme === "dark" ? "Light stock" : "Dark stock"}
          </button>

          <button
            type="button"
            className={s.drawerControl}
            onClick={toggleMusic}
            data-on={hydrated && music}
            tabIndex={open ? 0 : -1}
          >
            <span>{"♫"}</span>
            {hydrated && music ? "Stop music" : "Play music"}
          </button>

          <div className={s.drawerXp}>
            <div className={s.xpTop}>
              <span suppressHydrationWarning>LVL {level}</span>
              <span suppressHydrationWarning>{hydrated ? xp : 0} XP</span>
            </div>
            <div className={s.track}>
              <div className={s.fill} style={{ width: pct + "%" }} />
            </div>
          </div>
        </div>

        <div className={s.drawerFoot}>
          <div className={s.drawerRoster} aria-label="Recruited operatives">
            {agents.map((a) => {
              const on = hydrated && recruited.includes(a.id);
              return (
                <span key={a.id} className={s.slot} data-on={on} style={{ color: a.color }}>
                  <Sigil matrix={a.sigil} size={3} gap={1} />
                </span>
              );
            })}
          </div>
          <span className="micro dim" suppressHydrationWarning>
            LVL {level} · {hydrated ? xp : 0} XP
          </span>
        </div>
      </div>
    </>
  );
}
