"use client";

import { useCallback, useRef, useState, type SetStateAction } from "react";

type Snapshot<T> = { past: T[]; present: T | null; future: T[] };

/** Historial efímero para Undo/Redo. Las versiones persistidas se guardan vía el API. */
export function useStoreBuilderHistory<T>() {
  const [configuracion, setConfiguracionState] = useState<T | null>(null);
  const snapshots = useRef<Snapshot<T>>({ past: [], present: null, future: [] });

  const reset = useCallback((value: T) => {
    snapshots.current = { past: [], present: value, future: [] };
    setConfiguracionState(value);
  }, []);

  const setConfiguracion = useCallback((update: SetStateAction<T | null>) => {
    const previous = snapshots.current.present;
    const next = typeof update === "function"
      ? (update as (current: T | null) => T | null)(previous)
      : update;
    if (next === null || JSON.stringify(next) === JSON.stringify(previous)) return;

    snapshots.current = {
      past: previous === null ? [] : [...snapshots.current.past, previous].slice(-100),
      present: next,
      future: [],
    };
    setConfiguracionState(next);
  }, []);

  const undo = useCallback(() => {
    const { past, present, future } = snapshots.current;
    const previous = past[past.length - 1];
    if (previous === undefined || present === null) return;
    snapshots.current = { past: past.slice(0, -1), present: previous, future: [present, ...future] };
    setConfiguracionState(previous);
  }, []);

  const redo = useCallback(() => {
    const { past, present, future } = snapshots.current;
    const next = future[0];
    if (next === undefined || present === null) return;
    snapshots.current = { past: [...past, present], present: next, future: future.slice(1) };
    setConfiguracionState(next);
  }, []);

  return {
    configuracion,
    setConfiguracion,
    reset,
    undo,
    redo,
    canUndo: snapshots.current.past.length > 0,
    canRedo: snapshots.current.future.length > 0,
  };
}

