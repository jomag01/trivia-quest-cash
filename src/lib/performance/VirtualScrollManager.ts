// Virtual Scroll Manager for 100M+ concurrent users
// Efficiently renders large lists without memory exhaustion

interface VirtualItem<T> {
  data: T;
  index: number;
  offsetTop: number;
}

export interface VirtualScrollConfig {
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig
): {
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  scrollTo: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
} {
  const { itemHeight, overscan = 5, containerHeight } = config;
  
  const containerRef = { current: null as HTMLDivElement | null };
  let scrollTop = 0;
  
  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);
  
  const virtualItems: VirtualItem<T>[] = [];
  
  for (let i = startIndex; i < endIndex; i++) {
    virtualItems.push({
      data: items[i],
      index: i,
      offsetTop: i * itemHeight
    });
  }
  
  const scrollTo = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  };
  
  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollTo,
    containerRef: containerRef as React.RefObject<HTMLDivElement>
  };
}

// Infinite scroll with pagination
export class InfiniteScrollManager<T> {
  private items: T[] = [];
  private page = 0;
  private pageSize = 20;
  private hasMore = true;
  private loading = false;
  private fetchFn: (page: number, pageSize: number) => Promise<T[]>;
  private observers: Set<(items: T[], loading: boolean, hasMore: boolean) => void> = new Set();

  constructor(
    fetchFn: (page: number, pageSize: number) => Promise<T[]>,
    pageSize = 20
  ) {
    this.fetchFn = fetchFn;
    this.pageSize = pageSize;
  }

  subscribe(observer: (items: T[], loading: boolean, hasMore: boolean) => void): () => void {
    this.observers.add(observer);
    observer(this.items, this.loading, this.hasMore);
    return () => this.observers.delete(observer);
  }

  private notify(): void {
    this.observers.forEach(observer => observer(this.items, this.loading, this.hasMore));
  }

  async loadMore(): Promise<void> {
    if (this.loading || !this.hasMore) return;

    this.loading = true;
    this.notify();

    try {
      const newItems = await this.fetchFn(this.page, this.pageSize);
      
      if (newItems.length < this.pageSize) {
        this.hasMore = false;
      }

      this.items = [...this.items, ...newItems];
      this.page++;
    } catch (e) {
      console.error('Failed to load more items:', e);
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  reset(): void {
    this.items = [];
    this.page = 0;
    this.hasMore = true;
    this.loading = false;
    this.notify();
  }

  getItems(): T[] {
    return this.items;
  }
}
