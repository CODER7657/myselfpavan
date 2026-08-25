"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { reveal } from "@/lib/gsap";
import e from "./Explainer.module.css";

/**
 * The orientation strip.
 *
 * Most portfolios are a scroll. This one is a console, and a visitor who does
 * not already know that will bounce off it. So before anything technical
 * appears, three sentences explain the mechanic in plain words — and the page
 * still works perfectly if they ignore all of it and just scroll.
 */

const STEPS = [
  {
    n: "01",
    title: "Pick a mission",
    body: "Five of them, listed down the left of the console. Each one is a small job — work out who this is, go through the projects, check the education.",
  },
  {
    n: "02",
    title: "Press dispatch",
    body: "Six assistants share the work between them. You watch them think, look things up, and report back — live, one line at a time. Nothing is pre-recorded.",
  },
  {
    n: "03",
    title: "Read what they find",
    body: "Everything they report is on this page anyway. The console is just a more interesting way in. Scroll past it and you lose nothing.",
  },
];

export function Explainer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      reveal("." + e.step, root.current, { y: 22, stagger: 0.1 });
    },
    { scope: root }
  );

  return (
    <section className={e.strip} ref={root} aria-labelledby="explainer-heading">
      <div className="wrap">
        <div className={e.head}>
          <h2 id="explainer-heading" className={e.title}>
            This page is a <em>console</em>, not a scroll.
          </h2>
          <p className={e.lede}>
            You do not need to know anything technical to use it. Here is the whole idea, in
            three steps.
          </p>
        </div>

        <ol className={e.steps}>
          {STEPS.map((st) => (
            <li key={st.n} className={e.step}>
              <span className={e.num}>{st.n}</span>
              <h3 className={e.stepTitle}>{st.title}</h3>
              <p className={e.stepBody}>{st.body}</p>
            </li>
          ))}
        </ol>

        <div className={e.foot}>
          <a className="btn btn--primary" href="#console">
            Try it — run the first mission
          </a>
          <a className="btn btn--ghost" href="#vault">
            Or skip straight to the work
          </a>
        </div>
      </div>
    </section>
  );
}
