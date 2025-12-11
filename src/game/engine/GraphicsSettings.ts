// Graphics Quality Settings for MOBA Game
// Implements LOD, quality presets, and performance optimization

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsConfig {
  // Resolution scaling (0.5 = half res, 1.0 = full res, 2.0 = supersampling)
  resolutionScale: number;
  // Texture quality multiplier
  textureQuality: number;
  // Enable/disable shadows
  shadows: boolean;
  // Shadow quality (soft vs hard)
  shadowQuality: 'none' | 'hard' | 'soft';
  // Anti-aliasing
  antiAliasing: boolean;
  // Particle density multiplier
  particleDensity: number;
  // Max visible entities before LOD kicks in
  maxVisibleEntities: number;
  // LOD distance thresholds
  lodDistances: { high: number; medium: number; low: number };
  // Animation frame rate cap
  targetFPS: number;
  // Enable post-processing effects
  postProcessing: boolean;
  // Bloom effect
  bloom: boolean;
  // Motion blur
  motionBlur: boolean;
}

export const QUALITY_PRESETS: Record<QualityPreset, GraphicsConfig> = {
  low: {
    resolutionScale: 0.75,
    textureQuality: 0.5,
    shadows: false,
    shadowQuality: 'none',
    antiAliasing: false,
    particleDensity: 0.3,
    maxVisibleEntities: 20,
    lodDistances: { high: 100, medium: 200, low: 400 },
    targetFPS: 30,
    postProcessing: false,
    bloom: false,
    motionBlur: false,
  },
  medium: {
    resolutionScale: 1.0,
    textureQuality: 0.75,
    shadows: true,
    shadowQuality: 'hard',
    antiAliasing: false,
    particleDensity: 0.6,
    maxVisibleEntities: 40,
    lodDistances: { high: 150, medium: 300, low: 500 },
    targetFPS: 45,
    postProcessing: false,
    bloom: false,
    motionBlur: false,
  },
  high: {
    resolutionScale: 1.0,
    textureQuality: 1.0,
    shadows: true,
    shadowQuality: 'soft',
    antiAliasing: true,
    particleDensity: 0.85,
    maxVisibleEntities: 60,
    lodDistances: { high: 200, medium: 400, low: 600 },
    targetFPS: 60,
    postProcessing: true,
    bloom: false,
    motionBlur: false,
  },
  ultra: {
    resolutionScale: 1.25,
    textureQuality: 1.0,
    shadows: true,
    shadowQuality: 'soft',
    antiAliasing: true,
    particleDensity: 1.0,
    maxVisibleEntities: 100,
    lodDistances: { high: 300, medium: 500, low: 800 },
    targetFPS: 60,
    postProcessing: true,
    bloom: true,
    motionBlur: true,
  },
};

export class GraphicsManager {
  private config: GraphicsConfig;
  private currentPreset: QualityPreset;
  private frameTimeHistory: number[] = [];
  private lastFrameTime: number = 0;
  private autoAdjustEnabled: boolean = false;

  constructor(preset: QualityPreset = 'medium') {
    this.currentPreset = preset;
    this.config = { ...QUALITY_PRESETS[preset] };
  }

  setPreset(preset: QualityPreset): void {
    this.currentPreset = preset;
    this.config = { ...QUALITY_PRESETS[preset] };
    this.saveToStorage();
  }

  getConfig(): GraphicsConfig {
    return { ...this.config };
  }

  getPreset(): QualityPreset {
    return this.currentPreset;
  }

  // LOD level based on distance from camera/player
  getLODLevel(distance: number): 'high' | 'medium' | 'low' | 'culled' {
    const { lodDistances, maxVisibleEntities } = this.config;
    
    if (distance < lodDistances.high) return 'high';
    if (distance < lodDistances.medium) return 'medium';
    if (distance < lodDistances.low) return 'low';
    return 'culled'; // Don't render at all
  }

  // Get sprite scale based on LOD level
  getSpriteScale(lodLevel: 'high' | 'medium' | 'low' | 'culled'): number {
    switch (lodLevel) {
      case 'high': return 1.0;
      case 'medium': return 0.75;
      case 'low': return 0.5;
      case 'culled': return 0;
    }
  }

  // Get detail level for rendering (affects polygon count, effects, etc.)
  getDetailMultiplier(lodLevel: 'high' | 'medium' | 'low' | 'culled'): number {
    switch (lodLevel) {
      case 'high': return 1.0;
      case 'medium': return 0.6;
      case 'low': return 0.3;
      case 'culled': return 0;
    }
  }

  // Performance monitoring
  recordFrameTime(deltaTime: number): void {
    this.frameTimeHistory.push(deltaTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }

    if (this.autoAdjustEnabled) {
      this.autoAdjustQuality();
    }
  }

  getAverageFPS(): number {
    if (this.frameTimeHistory.length === 0) return 60;
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    return Math.round(1000 / avgFrameTime);
  }

  // Auto-adjust quality based on performance
  enableAutoAdjust(enabled: boolean): void {
    this.autoAdjustEnabled = enabled;
  }

  private autoAdjustQuality(): void {
    const fps = this.getAverageFPS();
    const targetFPS = this.config.targetFPS;

    // If FPS is too low, decrease quality
    if (fps < targetFPS * 0.7) {
      const presets: QualityPreset[] = ['low', 'medium', 'high', 'ultra'];
      const currentIndex = presets.indexOf(this.currentPreset);
      if (currentIndex > 0) {
        this.setPreset(presets[currentIndex - 1]);
        console.log(`Auto-adjusted quality to ${this.currentPreset} (FPS: ${fps})`);
      }
    }
  }

  // Particle system helpers
  getParticleCount(baseCount: number): number {
    return Math.floor(baseCount * this.config.particleDensity);
  }

  shouldRenderShadow(): boolean {
    return this.config.shadows;
  }

  getShadowBlur(): number {
    switch (this.config.shadowQuality) {
      case 'soft': return 15;
      case 'hard': return 5;
      case 'none': return 0;
    }
  }

  // Storage persistence
  saveToStorage(): void {
    try {
      localStorage.setItem('moba_graphics_preset', this.currentPreset);
    } catch (e) {
      console.warn('Could not save graphics settings');
    }
  }

  static loadFromStorage(): QualityPreset {
    try {
      const saved = localStorage.getItem('moba_graphics_preset');
      if (saved && ['low', 'medium', 'high', 'ultra'].includes(saved)) {
        return saved as QualityPreset;
      }
    } catch (e) {
      console.warn('Could not load graphics settings');
    }
    
    // Auto-detect based on device
    return GraphicsManager.detectOptimalPreset();
  }

  static detectOptimalPreset(): QualityPreset {
    // Check for mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check for hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;
    
    // Check device memory if available
    const memory = (navigator as any).deviceMemory || 4;
    
    // Check screen resolution
    const pixelRatio = window.devicePixelRatio || 1;
    const screenPixels = window.screen.width * window.screen.height * pixelRatio;

    if (isMobile) {
      if (memory <= 2 || cores <= 2) return 'low';
      if (memory <= 4 || cores <= 4) return 'medium';
      return 'high';
    }

    // Desktop
    if (cores >= 8 && memory >= 8 && screenPixels < 4000000) return 'ultra';
    if (cores >= 4 && memory >= 4) return 'high';
    if (cores >= 2) return 'medium';
    return 'low';
  }
}

// Singleton instance
let graphicsManagerInstance: GraphicsManager | null = null;

export function getGraphicsManager(): GraphicsManager {
  if (!graphicsManagerInstance) {
    const preset = GraphicsManager.loadFromStorage();
    graphicsManagerInstance = new GraphicsManager(preset);
  }
  return graphicsManagerInstance;
}
