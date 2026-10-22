import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { BusFront, MapPin, X } from "lucide-react";

export function PassengerBrand() {
  return <span className="ps-brand">
    <span className="ps-brand-mark" aria-hidden="true"><MapPin /><BusFront /></span>
    <span>TrackSafar</span>
  </span>;
}

export function PassengerEmpty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="ps-empty">
    <span className="ps-empty-icon" aria-hidden="true"><BusFront size={23} /></span>
    <h2>{title}</h2>
    <p>{children}</p>
  </div>;
}

export function PassengerModal({ title, children, onClose, busy = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = "passenger-dialog-title";
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return <dialog
    ref={ref}
    className="ps-dialog"
    aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget || busy) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}
  >
    <div className="ps-dialog-heading">
      <h2 id={titleId}>{title}</h2>
      <button type="button" className="ps-icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20} /></button>
    </div>
    {children}
  </dialog>;
}
