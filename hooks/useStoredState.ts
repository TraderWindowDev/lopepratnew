import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStoredState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValueRaw] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((stored) => {
      if (stored != null) {
        try { setValueRaw(JSON.parse(stored)); } catch {}
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [key]);

  const setValue = useCallback((newVal: T | ((p: T) => T)) => {
    setValueRaw((prev) => {
      const next = typeof newVal === 'function' ? (newVal as (p: T) => T)(prev) : newVal;
      AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [key]);

  return [value, setValue, loaded];
}
