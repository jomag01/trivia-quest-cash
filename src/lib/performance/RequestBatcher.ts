// Ultra-optimized Request Batcher for 100M+ concurrent users
// Batches multiple database queries into single requests

interface BatchedQuery {
  table: string;
  select: string;
  filters: Record<string, any>;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

class RequestBatcher {
  private static instance: RequestBatcher;
  private pendingQueries: Map<string, BatchedQuery[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchDelay = 10; // 10ms batching window
  private maxBatchSize = 50;

  private constructor() {}

  static getInstance(): RequestBatcher {
    if (!RequestBatcher.instance) {
      RequestBatcher.instance = new RequestBatcher();
    }
    return RequestBatcher.instance;
  }

  // Queue a query for batching
  async query<T>(
    supabase: any,
    table: string,
    select: string = '*',
    filters: Record<string, any> = {}
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const key = `${table}:${select}`;
      
      if (!this.pendingQueries.has(key)) {
        this.pendingQueries.set(key, []);
      }

      const queries = this.pendingQueries.get(key)!;
      queries.push({ table, select, filters, resolve, reject });

      // Execute immediately if batch is full
      if (queries.length >= this.maxBatchSize) {
        this.executeBatch(supabase, key);
        return;
      }

      // Schedule batch execution
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.executeAllBatches(supabase);
        }, this.batchDelay);
      }
    });
  }

  private async executeBatch(supabase: any, key: string): Promise<void> {
    const queries = this.pendingQueries.get(key);
    if (!queries || queries.length === 0) return;

    this.pendingQueries.delete(key);

    const [table, select] = key.split(':');
    
    // Combine all filter IDs into a single query where possible
    const idFilters = queries
      .filter(q => q.filters.id)
      .map(q => q.filters.id);

    try {
      if (idFilters.length > 0 && idFilters.length === queries.length) {
        // All queries are ID-based - batch into single IN query
        const { data, error } = await supabase
          .from(table)
          .select(select)
          .in('id', idFilters);

        if (error) {
          queries.forEach(q => q.reject(error));
          return;
        }

        // Distribute results to appropriate resolvers
        queries.forEach(q => {
          const result = data?.filter((d: any) => d.id === q.filters.id) || [];
          q.resolve(result);
        });
      } else {
        // Execute queries individually but in parallel
        await Promise.all(
          queries.map(async (q) => {
            try {
              let query = supabase.from(q.table).select(q.select);
              
              Object.entries(q.filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                  query = query.in(key, value);
                } else {
                  query = query.eq(key, value);
                }
              });

              const { data, error } = await query;
              
              if (error) {
                q.reject(error);
              } else {
                q.resolve(data || []);
              }
            } catch (e) {
              q.reject(e);
            }
          })
        );
      }
    } catch (e) {
      queries.forEach(q => q.reject(e));
    }
  }

  private async executeAllBatches(supabase: any): Promise<void> {
    this.batchTimeout = null;
    const keys = Array.from(this.pendingQueries.keys());
    
    await Promise.all(keys.map(key => this.executeBatch(supabase, key)));
  }

  // For simple count queries - heavily cached
  private countCache = new Map<string, { count: number; timestamp: number }>();
  private countCacheTTL = 30000; // 30 seconds

  async count(supabase: any, table: string, filters: Record<string, any> = {}): Promise<number> {
    const cacheKey = `${table}:${JSON.stringify(filters)}`;
    const cached = this.countCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.countCacheTTL) {
      return cached.count;
    }

    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;
    
    if (!error && count !== null) {
      this.countCache.set(cacheKey, { count, timestamp: Date.now() });
    }

    return count || 0;
  }
}

export const requestBatcher = RequestBatcher.getInstance();
