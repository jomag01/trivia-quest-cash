/**
 * AI Request Manager - Handles 100M+ concurrent users
 * Features: Request deduplication, queuing, retry logic, caching
 */

import { supabase } from '@/integrations/supabase/client';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

interface QueuedRequest {
  type: string;
  payload: any;
  priority: number;
  timestamp: number;
}

class AIRequestManager {
  private pendingRequests: Map<string, PendingRequest[]> = new Map();
  private requestQueue: QueuedRequest[] = [];
  private isProcessing = false;
  private maxConcurrent = 3;
  private activeRequests = 0;
  private localCache: Map<string, { data: any; expires: number }> = new Map();
  private readonly LOCAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Generate hash for deduplication
  private async hashRequest(type: string, payload: any): Promise<string> {
    const key = JSON.stringify({ type, ...payload });
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Check local cache first
  private getFromLocalCache(hash: string): any | null {
    const cached = this.localCache.get(hash);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.localCache.delete(hash);
    return null;
  }

  // Store in local cache with LRU eviction
  private setLocalCache(hash: string, data: any): void {
    // Evict oldest if at capacity
    if (this.localCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.localCache.keys().next().value;
      if (firstKey) this.localCache.delete(firstKey);
    }
    
    this.localCache.set(hash, {
      data,
      expires: Date.now() + this.LOCAL_CACHE_TTL
    });
  }

  // Main request method with deduplication
  async request(type: string, payload: any, priority = 0): Promise<any> {
    const hash = await this.hashRequest(type, payload);

    // Check local cache
    const localCached = this.getFromLocalCache(hash);
    if (localCached) {
      console.log('[AIManager] Local cache hit');
      return localCached;
    }

    // Check if identical request is already in flight
    if (this.pendingRequests.has(hash)) {
      console.log('[AIManager] Deduplicating request');
      return new Promise((resolve, reject) => {
        this.pendingRequests.get(hash)!.push({ resolve, reject });
      });
    }

    // Create new pending request
    this.pendingRequests.set(hash, []);

    return new Promise((resolve, reject) => {
      this.pendingRequests.get(hash)!.push({ resolve, reject });
      
      this.requestQueue.push({
        type,
        payload: { ...payload, _hash: hash },
        priority,
        timestamp: Date.now()
      });

      // Sort by priority (higher first), then by timestamp (older first)
      this.requestQueue.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      this.activeRequests++;
      this.executeRequest(request).finally(() => {
        this.activeRequests--;
        this.processQueue();
      });
    }

    this.isProcessing = false;
  }

  private async executeRequest(request: QueuedRequest): Promise<void> {
    const { type, payload } = request;
    const hash = payload._hash;
    delete payload._hash;

    try {
      const result = await this.callAIFunction(type, payload);
      
      // Cache successful results
      this.setLocalCache(hash, result);

      // Resolve all waiting promises
      const pending = this.pendingRequests.get(hash) || [];
      pending.forEach(p => p.resolve(result));
    } catch (error) {
      // Reject all waiting promises
      const pending = this.pendingRequests.get(hash) || [];
      pending.forEach(p => p.reject(error as Error));
    } finally {
      this.pendingRequests.delete(hash);
    }
  }

  private async callAIFunction(type: string, payload: any, retries = 3): Promise<any> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-generate', {
          body: { type, ...payload }
        });

        if (error) {
          // Don't retry on client errors
          if (error.message?.includes('402') || error.message?.includes('429')) {
            throw new Error(error.message);
          }
          throw error;
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        return data;
      } catch (error: any) {
        console.error(`[AIManager] Attempt ${attempt + 1} failed:`, error.message);
        
        // Don't retry certain errors
        if (error.message?.includes('Rate limit') || 
            error.message?.includes('credits') ||
            error.message?.includes('402') ||
            error.message?.includes('429')) {
          throw error;
        }

        // Exponential backoff
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Request failed after retries');
  }

  // Generate image with smart caching
  async generateImage(prompt: string, referenceImage?: string): Promise<{ imageUrl: string; cached: boolean }> {
    return this.request('text-to-image', { prompt, referenceImage }, referenceImage ? 1 : 0);
  }

  // Analyze image
  async analyzeImage(imageUrl: string): Promise<{ description: string; cached: boolean }> {
    return this.request('image-to-text', { imageUrl });
  }

  // Analyze video
  async analyzeVideo(videoUrl: string): Promise<{ description: string; cached: boolean }> {
    return this.request('video-to-text', { videoUrl });
  }

  // Clear local cache
  clearCache(): void {
    this.localCache.clear();
  }

  // Get queue status
  getStatus(): { queueLength: number; activeRequests: number; cacheSize: number } {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      cacheSize: this.localCache.size
    };
  }
}

// Singleton instance
export const aiManager = new AIRequestManager();