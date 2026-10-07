"use client";

import { useCallback, useRef, useState, type SetStateAction } from "react";

type Snapshot<T> = { past: T[]; present: T | null; future: T[] };

/** Historial efímero para Undo/Redo. Las versiones persistidas se guardan vía el API. */
export function useStoreBuilderHistory<T>() {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ past: [], present: null, future: [] });
  const snapshots = useRef<Snapshot<T>>({ past: [], present: null, future: [] });
  const TYPING_WINDOW_MS = 750;
  const lastChangeAt = useRef(0);

  const reset = useCallback((value: T) => {
    lastChangeAt.current = 0;
    snapshots.current = { past: [], present: value, future: [] };
    setSnapshot(snapshots.current);
  }, []);

  const setConfiguracion = useCallback((update: SetStateAction<T | null>) => {
    const previous = snapshots.current.present;
    const next = typeof update === "function"
      ? (update as (current: T | null) => T | null)(previous)
      : update;

    if (next === null || JSON.stringify(next) === JSON.stringify(previous)) return;

    const now = Date.now();
    const isContinuousTyping =
      previous !== null &&
      snapshots.current.past.length > 0 &&
      now - lastChangeAt.current < TYPING_WINDOW_MS;

    snapshots.current = {
      past: isContinuousTyping
        ? snapshots.current.past
        : previous === null
          ? []
          : [...snapshots.current.past, previous].slice(-100),
      present: next,
      future: [],
    };

    lastChangeAt.current = now;
    setSnapshot(snapshots.current);
  }, []);

  const undo = useCallback(() => {
    lastChangeAt.current = 0;
    const { past, present, future } = snapshots.current;
    const previous = past[past.length - 1];
    if (previous === undefined || present === null) return;
    snapshots.current = { past: past.slice(0, -1), present: previous, future: [present, ...future] };
    setSnapshot(snapshots.current);
  }, []);

  const redo = useCallback(() => {
    lastChangeAt.current = 0;
    const { past, present, future } = snapshots.current;
    const next = future[0];
    if (next === undefined || present === null) return;
    snapshots.current = { past: [...past, present], present: next, future: future.slice(1) };
    setSnapshot(snapshots.current);
  }, []);

  return {
    configuracion: snapshot.present,
    setConfiguracion,
    reset,
    undo,
    redo,
    canUndo: snapshot.past.length > 0,
    canRedo: snapshot.future.length > 0,
  };
}

