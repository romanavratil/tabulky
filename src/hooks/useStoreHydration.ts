import { useEffect, useState } from 'react';

type PersistStore = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (callback: () => void) => () => void;
  };
};

export function useStoreHydration<S extends PersistStore>(store: S): boolean {
  const [hydrated, setHydrated] = useState(store.persist.hasHydrated());

  useEffect(() => {
    const unsub = store.persist.onFinishHydration(() => setHydrated(true));
    if (store.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => {
      unsub?.();
    };
  }, [store]);

  return hydrated;
}
