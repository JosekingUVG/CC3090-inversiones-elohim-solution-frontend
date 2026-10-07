/** Ignore editor selection and the legacy sections mirror when pages are present. */
export function serializeDesign(config: Record<string, unknown>): string {
  const { currentPageId, sections, ...design } = config;
  void currentPageId;
  return JSON.stringify(config.pages ? design : { ...design, sections });
}

export function changedPageIds<T extends { id: string }>(
  pages: T[],
  savedDesign: string | null,
): Set<string> {
  if (savedDesign === null) return new Set();
  const savedPages: Array<{ id: string }> = JSON.parse(savedDesign).pages ?? [];
  const savedById = new Map(savedPages.map(page => [page.id, JSON.stringify(page)]));
  return new Set(pages.filter(page => savedById.get(page.id) !== JSON.stringify(page)).map(page => page.id));
}
