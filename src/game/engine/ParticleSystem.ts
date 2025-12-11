import * as PIXI from 'pixi.js';
import { getGraphicsManager } from './GraphicsSettings';

interface Particle {
  sprite: PIXI.Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
  alpha: number;
  color: number;
}

export class ParticleSystem {
  private container: PIXI.Container;
  private particles: Particle[] = [];
  private poolSize: number = 100;
  private particlePool: PIXI.Graphics[] = [];

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container();
    parentContainer.addChild(this.container);
    this.initPool();
  }

  private initPool(): void {
    const graphicsManager = getGraphicsManager();
    const adjustedPoolSize = graphicsManager.getParticleCount(this.poolSize);
    
    for (let i = 0; i < adjustedPoolSize; i++) {
      const particle = new PIXI.Graphics();
      particle.visible = false;
      this.particlePool.push(particle);
      this.container.addChild(particle);
    }
  }

  private getParticleFromPool(): PIXI.Graphics | null {
    for (const particle of this.particlePool) {
      if (!particle.visible) {
        return particle;
      }
    }
    return null;
  }

  // Emit particles at position
  emit(
    x: number,
    y: number,
    options: {
      count?: number;
      color?: number;
      speed?: number;
      spread?: number;
      life?: number;
      size?: number;
      gravity?: number;
    } = {}
  ): void {
    const graphicsManager = getGraphicsManager();
    const baseCount = options.count || 10;
    const adjustedCount = graphicsManager.getParticleCount(baseCount);

    for (let i = 0; i < adjustedCount; i++) {
      const sprite = this.getParticleFromPool();
      if (!sprite) continue;

      const angle = Math.random() * Math.PI * 2;
      const speed = (options.speed || 5) * (0.5 + Math.random() * 0.5);
      const spread = options.spread || 1;
      const size = (options.size || 4) * (0.5 + Math.random() * 0.5);
      const color = options.color || 0xffffff;

      sprite.clear();
      sprite.beginFill(color, 0.8);
      sprite.drawCircle(0, 0, size);
      sprite.endFill();
      sprite.x = x + (Math.random() - 0.5) * spread * 20;
      sprite.y = y + (Math.random() - 0.5) * spread * 20;
      sprite.visible = true;
      sprite.alpha = 1;

      const particle: Particle = {
        sprite,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: options.life || 1,
        maxLife: options.life || 1,
        scale: 1,
        alpha: 1,
        color,
      };

      this.particles.push(particle);
    }
  }

  // Emit trail particles (for projectiles, movement)
  emitTrail(x: number, y: number, color: number = 0xf1c40f): void {
    this.emit(x, y, {
      count: 3,
      color,
      speed: 1,
      spread: 0.3,
      life: 0.3,
      size: 3,
    });
  }

  // Emit explosion particles
  emitExplosion(x: number, y: number, color: number = 0xe74c3c): void {
    this.emit(x, y, {
      count: 20,
      color,
      speed: 8,
      spread: 1,
      life: 0.5,
      size: 6,
    });
  }

  // Emit hit effect
  emitHit(x: number, y: number): void {
    this.emit(x, y, {
      count: 8,
      color: 0xff6b6b,
      speed: 4,
      spread: 0.5,
      life: 0.3,
      size: 4,
    });
  }

  // Emit heal effect
  emitHeal(x: number, y: number): void {
    this.emit(x, y, {
      count: 12,
      color: 0x2ecc71,
      speed: 2,
      spread: 1,
      life: 0.8,
      size: 5,
    });
  }

  // Emit level up effect
  emitLevelUp(x: number, y: number): void {
    this.emit(x, y, {
      count: 30,
      color: 0xf1c40f,
      speed: 6,
      spread: 2,
      life: 1.2,
      size: 6,
    });
  }

  update(deltaTime: number): void {
    const gravity = 0.1;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        particle.sprite.visible = false;
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      particle.sprite.x += particle.vx;
      particle.sprite.y += particle.vy;
      particle.vy += gravity;

      // Update alpha based on remaining life
      const lifeRatio = particle.life / particle.maxLife;
      particle.sprite.alpha = lifeRatio;
      particle.sprite.scale.set(lifeRatio);
    }
  }

  clear(): void {
    for (const particle of this.particles) {
      particle.sprite.visible = false;
    }
    this.particles = [];
  }

  destroy(): void {
    this.clear();
    this.container.destroy({ children: true });
  }
}
