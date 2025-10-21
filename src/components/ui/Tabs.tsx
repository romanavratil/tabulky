import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type TabsContextValue = {
  active: string;
  setActive: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const generatedId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const active = value ?? internal;

  const setActive = useCallback(
    (next: string) => {
      setInternal(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );

  const ctx = useMemo<TabsContextValue>(
    () => ({
      active,
      setActive,
      baseId: generatedId,
    }),
    [active, setActive, generatedId],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

type TabsListProps = {
  children: ReactNode;
  className?: string;
};

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={['rounded-full bg-surfaceMuted p-1', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

type TabsTriggerProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const ctx = useTabsContext();
  const isActive = ctx.active === value;
  return (
    <button
      id={`${ctx.baseId}-trigger-${value}`}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`${ctx.baseId}-content-${value}`}
      onClick={() => ctx.setActive(value)}
      className={[
        'rounded-full px-4 py-2 text-sm font-medium transition',
        isActive ? 'bg-brand text-white shadow-soft' : 'text-muted hover:text-foreground',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

type TabsContentProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function TabsContent({ value, children, className }: TabsContentProps) {
  const ctx = useTabsContext();
  const hidden = ctx.active !== value;
  return (
    <div
      id={`${ctx.baseId}-content-${value}`}
      role="tabpanel"
      aria-labelledby={`${ctx.baseId}-trigger-${value}`}
      hidden={hidden}
      className={className}
    >
      {!hidden && children}
    </div>
  );
}

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs components must be used within <Tabs>');
  }
  return ctx;
}
