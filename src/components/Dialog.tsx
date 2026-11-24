"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "./bits";

export function Dialog({
  open,
  onClose,
  title,
  children,
  sheet = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  sheet?: boolean;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const t = setTimeout(() => {
      panel.current?.querySelector<HTMLElement>("button, a, input, select, textarea")?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-[1200] flex bg-[rgb(18_14_10/0.45)] ${sheet ? "items-end" : "items-end sm:items-center"} justify-center sm:p-4`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="paper sketch-alt max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-b-[inherit]"
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-2xl">
                {title}
              </h2>
              <button className="btn sketch !min-h-[40px] !px-2" onClick={onClose} aria-label="Close">
                <Icon.close />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
