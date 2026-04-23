export interface ScaledRect {
  x1: number; y1: number; x2: number; y2: number;
  width: number; height: number; pageNumber?: number;
}

export interface ViewportRect {
  left: number; top: number; width: number; height: number;
  pageNumber?: number;
}

export interface PageInfo {
  node: HTMLElement; number: number;
}

export function scaledToViewport(
  scaled: ScaledRect,
  viewport: { width: number; height: number },
): ViewportRect {
  return {
    left: (viewport.width * scaled.x1) / scaled.width,
    top: (viewport.height * scaled.y1) / scaled.height,
    width: (viewport.width * (scaled.x2 - scaled.x1)) / scaled.width,
    height: (viewport.height * (scaled.y2 - scaled.y1)) / scaled.height,
    pageNumber: scaled.pageNumber,
  };
}

export function viewportToScaled(
  rect: ViewportRect,
  viewport: { width: number; height: number },
): ScaledRect {
  return {
    x1: rect.left,
    y1: rect.top,
    x2: rect.left + rect.width,
    y2: rect.top + rect.height,
    width: viewport.width,
    height: viewport.height,
    pageNumber: rect.pageNumber,
  };
}

export function viewportPositionToScaled(
  position: { boundingRect: ViewportRect; rects: ViewportRect[] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewer: any,
): { boundingRect: ScaledRect; rects: ScaledRect[] } {
  const page = viewer.getPageView((position.boundingRect.pageNumber ?? 1) - 1);
  const viewport = page.viewport;
  return {
    boundingRect: viewportToScaled(position.boundingRect, viewport),
    rects: position.rects.map((r) => viewportToScaled(r, viewport)),
  };
}

export function getPageFromElement(target: Node): PageInfo | null {
  const el = target instanceof HTMLElement ? target : target.parentElement;
  if (!el) return null;
  const node = el.closest<HTMLElement>(".page");
  if (!node) return null;
  const number = Number(node.dataset.pageNumber);
  return number ? { node, number } : null;
}

export function getPagesFromRange(range: Range): PageInfo[] {
  const startPage = getPageFromElement(range.startContainer);
  const endPage = getPageFromElement(range.endContainer);
  if (!startPage) return [];
  if (!endPage || startPage.number === endPage.number) return [startPage];
  const pages: PageInfo[] = [];
  for (let i = startPage.number; i <= endPage.number; i++) {
    const node = document.querySelector<HTMLElement>(
      `.page[data-page-number="${i}"]`,
    );
    if (node) pages.push({ node, number: i });
  }
  return pages;
}

export function optimizeClientRects(rects: ViewportRect[]): ViewportRect[] {
  const sorted = [...rects].sort(
    (a, b) =>
      (a.pageNumber ?? 0) * 10000 + a.top - ((b.pageNumber ?? 0) * 10000 + b.top) ||
      a.left - b.left,
  );

  // Remove rects contained inside others
  const filtered = sorted.filter(
    (r, i) =>
      !sorted.some(
        (s, j) =>
          i !== j &&
          s.left <= r.left &&
          s.top <= r.top &&
          s.left + s.width >= r.left + r.width &&
          s.top + s.height >= r.top + r.height,
      ),
  );

  // Merge overlapping/adjacent rects on same line
  const merged: ViewportRect[] = [];
  for (const r of filtered) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.pageNumber === r.pageNumber &&
      Math.abs(last.top - r.top) < 5 &&
      last.left + last.width + 10 >= r.left
    ) {
      const right = Math.max(last.left + last.width, r.left + r.width);
      const bottom = Math.max(last.top + last.height, r.top + r.height);
      last.top = Math.min(last.top, r.top);
      last.left = Math.min(last.left, r.left);
      last.width = right - last.left;
      last.height = bottom - last.top;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

export function getClientRects(
  range: Range,
  pages: PageInfo[],
): ViewportRect[] {
  const clientRects = Array.from(range.getClientRects());
  const rects: ViewportRect[] = [];

  // Find typical line height to filter out browser-synthesized bounding rects
  const heights = clientRects.filter(r => r.height > 0).map(r => r.height).sort((a, b) => a - b);
  const lineHeight = heights.length > 0 ? heights[Math.floor(heights.length / 2)] : 0;

  for (const page of pages) {
    const textLayer = page.node.querySelector('.textLayer');
    const ref = textLayer ? textLayer.getBoundingClientRect() : page.node.getBoundingClientRect();
    for (const cr of clientRects) {
      // Skip rects much taller than a single line (browser bounding rects)
      if (lineHeight > 0 && cr.height > lineHeight * 2.5) continue;
      // Clamp rect to textLayer bounds
      const left = Math.max(cr.left, ref.left);
      const top = Math.max(cr.top, ref.top);
      const right = Math.min(cr.right, ref.right);
      const bottom = Math.min(cr.bottom, ref.bottom);
      const w = right - left;
      const h = bottom - top;
      // Skip narrow slivers (artifacts from clamping)
      if (w > 3 && h > 0) {
        rects.push({
          top: top - ref.top,
          left: left - ref.left,
          width: w,
          height: h,
          pageNumber: page.number,
        });
      }
    }
  }
  return optimizeClientRects(rects);
}

export function getBoundingRect(rects: ViewportRect[]): ViewportRect {
  const pageNumber = rects[0]?.pageNumber;
  const filtered = rects.filter((r) => r.pageNumber === pageNumber);
  const left = Math.min(...filtered.map((r) => r.left));
  const top = Math.min(...filtered.map((r) => r.top));
  const right = Math.max(...filtered.map((r) => r.left + r.width));
  const bottom = Math.max(...filtered.map((r) => r.top + r.height));
  return { left, top, width: right - left, height: bottom - top, pageNumber };
}
