import { act, renderHook } from "@testing-library/react";
import { useStoreBuilderHistory } from "../useStoreBuilderHistory";

describe("store builder history", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());

  it("updates the undo/redo controls and restores the corresponding design", () => {
    const { result } = renderHook(() => useStoreBuilderHistory<{ title: string }>());
    act(() => result.current.reset({ title: "Original" }));
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.setConfiguracion({ title: "Edited" }));
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.undo());
    expect(result.current.configuracion?.title).toBe("Original");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.configuracion?.title).toBe("Edited");
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("groups continuous typing and starts a new step after a pause", () => {
    const { result } = renderHook(() => useStoreBuilderHistory<{ title: string }>());
    act(() => result.current.reset({ title: "" }));
    act(() => result.current.setConfiguracion({ title: "A" }));
    act(() => {
      jest.advanceTimersByTime(200);
      result.current.setConfiguracion({ title: "AB" });
    });
    act(() => {
      jest.advanceTimersByTime(800);
      result.current.setConfiguracion({ title: "ABC" });
    });
    act(() => result.current.undo());
    expect(result.current.configuracion?.title).toBe("AB");
    act(() => result.current.undo());
    expect(result.current.configuracion?.title).toBe("");
  });

  it("clears redo after a new edit and clears both histories when switching stores", () => {
    const { result } = renderHook(() => useStoreBuilderHistory<{ title: string }>());
    act(() => result.current.reset({ title: "First store" }));
    act(() => result.current.setConfiguracion({ title: "Edited" }));
    act(() => result.current.undo());
    act(() => result.current.setConfiguracion(previous => ({ title: `${previous?.title}!` })));
    expect(result.current.configuracion?.title).toBe("First store!");
    expect(result.current.canRedo).toBe(false);
    act(() => result.current.reset({ title: "Second store" }));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
