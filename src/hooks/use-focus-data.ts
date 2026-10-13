import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

/**
 * Loads data whenever the screen gains focus; `reload` refreshes it after a change.
 * `load` must be a stable (module-level) function; pass what it depends on as `arg`.
 */
export function useFocusData<T, A = undefined>(load: (arg: A) => Promise<T>, arg?: A) {
  const focused = useIsFocused();
  const [data, setData] = useState<T | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    load(arg as A)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [focused, version, load, arg]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return [data, reload] as const;
}
