"use client";
import { useRef, type ReactNode } from "react";

/** Native dialog supplies focus trapping, Escape, and focus restoration. */
export function Drawer({
  title,
  label,
  children,
  wide = false,
  primary = false,
}: {
  title: string;
  label: string;
  children: ReactNode;
  wide?: boolean;
  primary?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={`op-button ${primary ? "" : "secondary"}`}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        className={`op-drawer ${wide ? "wide" : ""}`}
        aria-label={title}
      >
        <header className="op-drawer-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="op-button secondary small"
            onClick={() => dialog.current?.close()}
            aria-label={`Cerrar ${title}`}
          >
            Cerrar ✕
          </button>
        </header>
        <div className="op-drawer-body">{children}</div>
      </dialog>
    </>
  );
}
