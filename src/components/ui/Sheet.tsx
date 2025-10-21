import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Sheet({ open, onClose, title, children }: SheetProps) {
  const titleId = useId();
  const scrollPosition = useRef(0);
  const previousStyles = useRef<{
    overflow: string;
    position: string;
    top: string;
    width: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) {
      if (previousStyles.current) {
        const prev = previousStyles.current;
        document.body.style.overflow = prev.overflow;
        document.body.style.position = prev.position;
        document.body.style.top = prev.top;
        document.body.style.width = prev.width;
        window.scrollTo(0, scrollPosition.current);
        previousStyles.current = null;
      }
      return;
    }

    if (previousStyles.current) return;
    scrollPosition.current = window.scrollY;
    previousStyles.current = {
      overflow: document.body.style.overflow || '',
      position: document.body.style.position || '',
      top: document.body.style.top || '',
      width: document.body.style.width || '',
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition.current}px`;
    document.body.style.width = '100%';

    return () => {
      if (previousStyles.current) {
        const prev = previousStyles.current;
        document.body.style.overflow = prev.overflow;
        document.body.style.position = prev.position;
        document.body.style.top = prev.top;
        document.body.style.width = prev.width;
        window.scrollTo(0, scrollPosition.current);
        previousStyles.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 px-3 py-8">
      <div
        className="absolute inset-0"
        role="presentation"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl"
      >
        {title && (
          <div className="border-b border-white/5 px-6 pb-4 pt-6">
            <h2 id={titleId} className="text-lg font-semibold text-foreground break-words leading-tight">
              {title}
            </h2>
          </div>
        )}
        <div className="max-h-[80vh] overflow-y-auto px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}
