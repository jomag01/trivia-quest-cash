import * as PIXI from 'pixi.js';
import { GameState, InputState, PlayerEntity, EnemyEntity, GameLevel, Hero, Projectile } from '../types';

export class GameEngine {
  private app: PIXI.Application;
  private gameState: GameState;
  private inputState: InputState;
  private gameContainer: PIXI.Container;
  private uiContainer: PIXI.Container;
  private playerSprite: PIXI.Graphics | null = null;
  private enemySprites: Map<string, PIXI.Graphics> = new Map();
  private projectileSprites: Map<string, PIXI.Graphics> = new Map();
  private healthBars: Map<string, PIXI.Graphics> = new Map();
  private onGameEnd: (victory: boolean, score: number, kills: number, timeUsed: number) => void;
  private startTime: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    onGameEnd: (victory: boolean, score: number, kills: number, timeUsed: number) => void
  ) {
    this.app = new PIXI.Application({
      view: canvas,
      width,
      height,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.onGameEnd = onGameEnd;
    this.gameContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.app.stage.addChild(this.gameContainer);
    this.app.stage.addChild(this.uiContainer);

    this.gameState = this.createInitialState();
    this.inputState = {
      keys: new Set(),
      mouseX: 0,
      mouseY: 0,
      isMouseDown: false,
    };

    this.setupInput(canvas);
  }

  private createInitialState(): GameState {
    return {
      isRunning: false,
      isPaused: false,
      level: null,
      player: null,
      enemies: [],
      projectiles: [],
      score: 0,
      timeRemaining: 0,
      killCount: 0,
      isVictory: false,
      isDefeat: false,
    };
  }

  private setupInput(canvas: HTMLCanvasElement) {
    // Keyboard input
    window.addEventListener('keydown', (e) => {
      this.inputState.keys.add(e.key.toLowerCase());
      if (e.key === 'Escape') this.togglePause();
      if (e.key === '1') this.useSkill(1);
      if (e.key === '2') this.useSkill(2);
      if (e.key === '3') this.useSkill(3); // Ultimate
    });

    window.addEventListener('keyup', (e) => {
      this.inputState.keys.delete(e.key.toLowerCase());
    });

    // Mouse input
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.inputState.mouseX = e.clientX - rect.left;
      this.inputState.mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
      this.inputState.isMouseDown = true;
      const rect = canvas.getBoundingClientRect();
      this.inputState.clickTargetX = e.clientX - rect.left;
      this.inputState.clickTargetY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseup', () => {
      this.inputState.isMouseDown = false;
    });

    // Touch input for mobile
    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      this.inputState.clickTargetX = touch.clientX - rect.left;
      this.inputState.clickTargetY = touch.clientY - rect.top;
    });
  }

  startGame(level: GameLevel, hero: Hero) {
    this.gameState = this.createInitialState();
    this.gameState.level = level;
    this.gameState.timeRemaining = level.timeLimitSeconds;
    this.startTime = Date.now();

    // Create player entity
    const mapConfig = level.mapConfig;
    this.gameState.player = {
      id: 'player',
      x: mapConfig.spawn_x,
      y: mapConfig.spawn_y,
      width: 40,
      height: 40,
      hp: hero.baseHp,
      maxHp: hero.baseHp,
      attack: hero.baseAttack,
      defense: hero.baseDefense,
      speed: hero.baseSpeed,
      isAlive: true,
      hero,
      skill1Cooldown: 0,
      skill2Cooldown: 0,
      ultimateCooldown: 0,
      xp: 0,
      level: 1,
      activeBuffs: [],
    };

    // Create enemies
    this.spawnEnemies(level);

    // Clear previous sprites
    this.gameContainer.removeChildren();
    this.enemySprites.clear();
    this.projectileSprites.clear();
    this.healthBars.clear();

    // Draw background
    this.drawBackground(level);

    // Create player sprite
    this.playerSprite = this.createPlayerSprite(hero);
    this.gameContainer.addChild(this.playerSprite);

    this.gameState.isRunning = true;
    this.gameLoop();
  }

  private spawnEnemies(level: GameLevel) {
    const mapConfig = level.mapConfig;
    const diffMult = level.difficultyMultiplier;

    level.enemyConfig.forEach((config, configIndex) => {
      for (let i = 0; i < config.count; i++) {
        const enemy: EnemyEntity = {
          id: `enemy_${configIndex}_${i}`,
          x: mapConfig.width - 100 - Math.random() * 200,
          y: Math.random() * (mapConfig.height - 100) + 50,
          width: 35,
          height: 35,
          hp: Math.floor(config.hp * diffMult),
          maxHp: Math.floor(config.hp * diffMult),
          attack: Math.floor(config.attack * diffMult),
          defense: 2,
          speed: config.speed || 2,
          isAlive: true,
          type: config.type,
          isBoss: false,
          aiState: 'idle',
          abilities: config.abilities || [],
        };
        this.gameState.enemies.push(enemy);

        // Create enemy sprite
        const sprite = this.createEnemySprite(config.type);
        sprite.x = enemy.x;
        sprite.y = enemy.y;
        this.enemySprites.set(enemy.id, sprite);
        this.gameContainer.addChild(sprite);
      }
    });

    // Spawn boss if boss level
    if (level.bossConfig && mapConfig.boss_spawn_x) {
      const boss: EnemyEntity = {
        id: 'boss',
        x: mapConfig.boss_spawn_x,
        y: mapConfig.boss_spawn_y || mapConfig.height / 2,
        width: 80,
        height: 80,
        hp: Math.floor(level.bossConfig.hp * diffMult),
        maxHp: Math.floor(level.bossConfig.hp * diffMult),
        attack: Math.floor(level.bossConfig.attack * diffMult),
        defense: level.bossConfig.defense,
        speed: 1.5,
        isAlive: true,
        type: 'boss',
        isBoss: true,
        aiState: 'idle',
        abilities: level.bossConfig.abilities,
        currentPhase: 0,
      };
      this.gameState.enemies.push(boss);

      const bossSprite = this.createBossSprite(level.bossConfig.name);
      bossSprite.x = boss.x;
      bossSprite.y = boss.y;
      this.enemySprites.set(boss.id, bossSprite);
      this.gameContainer.addChild(bossSprite);
    }
  }

  private drawBackground(level: GameLevel) {
    const bg = new PIXI.Graphics();
    bg.beginFill(0x2d3436);
    bg.drawRect(0, 0, level.mapConfig.width, level.mapConfig.height);
    bg.endFill();

    // Draw grid
    bg.lineStyle(1, 0x3d4446, 0.3);
    for (let x = 0; x < level.mapConfig.width; x += 50) {
      bg.moveTo(x, 0);
      bg.lineTo(x, level.mapConfig.height);
    }
    for (let y = 0; y < level.mapConfig.height; y += 50) {
      bg.moveTo(0, y);
      bg.lineTo(level.mapConfig.width, y);
    }

    this.gameContainer.addChildAt(bg, 0);
  }

  private createPlayerSprite(hero: Hero): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    
    // Body based on role
    const colors: Record<string, number> = {
      warrior: 0x3498db,
      mage: 0x9b59b6,
      assassin: 0xe74c3c,
      tank: 0x27ae60,
      support: 0xf1c40f,
    };
    
    const color = colors[hero.role] || 0x3498db;
    
    graphics.beginFill(color);
    graphics.drawCircle(0, 0, 20);
    graphics.endFill();
    
    // Direction indicator
    graphics.beginFill(0xffffff);
    graphics.drawCircle(12, 0, 5);
    graphics.endFill();

    return graphics;
  }

  private createEnemySprite(type: string): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    
    const colors: Record<string, number> = {
      dummy: 0x95a5a6,
      goblin: 0x2ecc71,
      wolf: 0x7f8c8d,
      goblin_archer: 0x27ae60,
      bat: 0x34495e,
      spider: 0x8e44ad,
    };
    
    const color = colors[type] || 0xe74c3c;
    
    graphics.beginFill(color);
    graphics.drawRect(-17, -17, 34, 34);
    graphics.endFill();
    
    // Eye
    graphics.beginFill(0xffffff);
    graphics.drawCircle(5, -5, 4);
    graphics.endFill();
    graphics.beginFill(0x000000);
    graphics.drawCircle(6, -5, 2);
    graphics.endFill();

    return graphics;
  }

  private createBossSprite(name: string): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    
    // Large boss body
    graphics.beginFill(0x8e44ad);
    graphics.drawCircle(0, 0, 40);
    graphics.endFill();
    
    // Crown/spikes
    graphics.beginFill(0xf1c40f);
    graphics.drawPolygon([-30, -30, -25, -50, -20, -30]);
    graphics.drawPolygon([0, -35, 5, -55, 10, -35]);
    graphics.drawPolygon([25, -30, 30, -50, 35, -30]);
    graphics.endFill();
    
    // Eyes
    graphics.beginFill(0xe74c3c);
    graphics.drawCircle(-15, -5, 8);
    graphics.drawCircle(15, -5, 8);
    graphics.endFill();

    return graphics;
  }

  private gameLoop = () => {
    if (!this.gameState.isRunning) return;
    if (this.gameState.isPaused) {
      requestAnimationFrame(this.gameLoop);
      return;
    }

    this.update();
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update() {
    if (!this.gameState.player || !this.gameState.level) return;

    // Update timer
    this.gameState.timeRemaining -= 1 / 60;
    if (this.gameState.timeRemaining <= 0) {
      this.endGame(false);
      return;
    }

    // Update player movement
    this.updatePlayerMovement();

    // Update cooldowns
    this.updateCooldowns();

    // Update enemies AI
    this.updateEnemies();

    // Update projectiles
    this.updateProjectiles();

    // Check collisions
    this.checkCollisions();

    // Check win condition
    if (this.gameState.enemies.filter(e => e.isAlive).length === 0) {
      this.endGame(true);
    }

    // Check defeat
    if (!this.gameState.player.isAlive) {
      this.endGame(false);
    }
  }

  private updatePlayerMovement() {
    const player = this.gameState.player!;
    const level = this.gameState.level!;
    let dx = 0, dy = 0;

    // WASD / Arrow keys
    if (this.inputState.keys.has('w') || this.inputState.keys.has('arrowup')) dy -= 1;
    if (this.inputState.keys.has('s') || this.inputState.keys.has('arrowdown')) dy += 1;
    if (this.inputState.keys.has('a') || this.inputState.keys.has('arrowleft')) dx -= 1;
    if (this.inputState.keys.has('d') || this.inputState.keys.has('arrowright')) dx += 1;

    // Click-to-move
    if (this.inputState.clickTargetX !== undefined && this.inputState.clickTargetY !== undefined) {
      const distX = this.inputState.clickTargetX - player.x;
      const distY = this.inputState.clickTargetY - player.y;
      const dist = Math.sqrt(distX * distX + distY * distY);
      
      if (dist > 5) {
        dx = distX / dist;
        dy = distY / dist;
      } else {
        this.inputState.clickTargetX = undefined;
        this.inputState.clickTargetY = undefined;
      }
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    // Apply speed
    const speed = this.getEffectiveSpeed(player);
    player.x += dx * speed;
    player.y += dy * speed;

    // Bounds check
    player.x = Math.max(20, Math.min(level.mapConfig.width - 20, player.x));
    player.y = Math.max(20, Math.min(level.mapConfig.height - 20, player.y));

    // Update sprite rotation based on movement
    if (this.playerSprite && (dx !== 0 || dy !== 0)) {
      this.playerSprite.rotation = Math.atan2(dy, dx);
    }
  }

  private getEffectiveSpeed(entity: PlayerEntity): number {
    let speed = entity.speed;
    entity.activeBuffs.forEach(buff => {
      if (buff.type === 'speed') speed *= buff.multiplier;
    });
    return speed;
  }

  private updateCooldowns() {
    const player = this.gameState.player!;
    const dt = 1 / 60;

    if (player.skill1Cooldown > 0) player.skill1Cooldown -= dt;
    if (player.skill2Cooldown > 0) player.skill2Cooldown -= dt;
    if (player.ultimateCooldown > 0) player.ultimateCooldown -= dt;

    // Update buffs
    player.activeBuffs = player.activeBuffs.filter(buff => {
      return (Date.now() - buff.startTime) / 1000 < buff.duration;
    });
  }

  private updateEnemies() {
    const player = this.gameState.player!;

    this.gameState.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Simple AI: Chase player if in range
      if (dist < 400) {
        enemy.aiState = 'chase';
        const speed = enemy.speed;
        enemy.x += (dx / dist) * speed;
        enemy.y += (dy / dist) * speed;
      } else {
        enemy.aiState = 'idle';
      }

      // Attack if close
      if (dist < 50 && enemy.aiState === 'chase') {
        enemy.aiState = 'attack';
        // Deal damage to player
        const damage = Math.max(1, enemy.attack - player.defense / 2);
        player.hp -= damage * (1 / 60); // Damage over time while close
      }

      // Update sprite position
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        sprite.x = enemy.x;
        sprite.y = enemy.y;
      }
    });
  }

  private updateProjectiles() {
    this.gameState.projectiles = this.gameState.projectiles.filter(proj => {
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < proj.speed) {
        // Reached target
        const sprite = this.projectileSprites.get(proj.id);
        if (sprite) {
          this.gameContainer.removeChild(sprite);
          this.projectileSprites.delete(proj.id);
        }
        return false;
      }

      proj.x += (dx / dist) * proj.speed;
      proj.y += (dy / dist) * proj.speed;

      const sprite = this.projectileSprites.get(proj.id);
      if (sprite) {
        sprite.x = proj.x;
        sprite.y = proj.y;
      }

      return true;
    });
  }

  private checkCollisions() {
    const player = this.gameState.player!;

    // Projectile vs enemy
    this.gameState.projectiles.forEach(proj => {
      if (proj.owner !== 'player') return;

      this.gameState.enemies.forEach(enemy => {
        if (!enemy.isAlive) return;

        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) {
          const damage = Math.max(1, proj.damage - enemy.defense);
          enemy.hp -= damage;

          if (enemy.hp <= 0) {
            enemy.isAlive = false;
            this.gameState.killCount++;
            this.gameState.score += enemy.isBoss ? 1000 : 100;

            const sprite = this.enemySprites.get(enemy.id);
            if (sprite) {
              this.gameContainer.removeChild(sprite);
            }
          }
        }
      });
    });
  }

  useSkill(skillNumber: 1 | 2 | 3) {
    const player = this.gameState.player;
    if (!player || !player.isAlive) return;

    const skill = skillNumber === 1 ? player.hero.skill1 
      : skillNumber === 2 ? player.hero.skill2 
      : player.hero.ultimate;

    const cooldown = skillNumber === 1 ? player.skill1Cooldown
      : skillNumber === 2 ? player.skill2Cooldown
      : player.ultimateCooldown;

    if (cooldown > 0) return;

    // Set cooldown
    if (skillNumber === 1) player.skill1Cooldown = skill.cooldown;
    else if (skillNumber === 2) player.skill2Cooldown = skill.cooldown;
    else player.ultimateCooldown = skill.cooldown;

    // Create projectile towards mouse/nearest enemy
    const targetX = this.inputState.mouseX || player.x + 100;
    const targetY = this.inputState.mouseY || player.y;

    const projectile: Projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      x: player.x,
      y: player.y,
      targetX,
      targetY,
      speed: 15,
      damage: skill.damage || player.attack,
      owner: 'player',
      type: skill.name,
    };

    this.gameState.projectiles.push(projectile);

    // Create projectile sprite
    const projSprite = new PIXI.Graphics();
    projSprite.beginFill(0xf1c40f);
    projSprite.drawCircle(0, 0, 8);
    projSprite.endFill();
    projSprite.x = player.x;
    projSprite.y = player.y;
    this.projectileSprites.set(projectile.id, projSprite);
    this.gameContainer.addChild(projSprite);
  }

  private render() {
    const player = this.gameState.player;
    if (!player || !this.playerSprite) return;

    // Update player sprite position
    this.playerSprite.x = player.x;
    this.playerSprite.y = player.y;

    // Camera follow
    const level = this.gameState.level!;
    const viewWidth = this.app.screen.width;
    const viewHeight = this.app.screen.height;

    let camX = -player.x + viewWidth / 2;
    let camY = -player.y + viewHeight / 2;

    camX = Math.min(0, Math.max(-level.mapConfig.width + viewWidth, camX));
    camY = Math.min(0, Math.max(-level.mapConfig.height + viewHeight, camY));

    this.gameContainer.x = camX;
    this.gameContainer.y = camY;
  }

  togglePause() {
    this.gameState.isPaused = !this.gameState.isPaused;
  }

  private endGame(victory: boolean) {
    this.gameState.isRunning = false;
    this.gameState.isVictory = victory;
    this.gameState.isDefeat = !victory;

    const timeUsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.onGameEnd(victory, this.gameState.score, this.gameState.killCount, timeUsed);
  }

  applyBoost(type: string, multiplier: number, duration: number) {
    if (!this.gameState.player) return;

    this.gameState.player.activeBuffs.push({
      type,
      multiplier,
      duration,
      startTime: Date.now(),
    });

    if (type === 'hp_restore') {
      this.gameState.player.hp = Math.min(
        this.gameState.player.maxHp,
        this.gameState.player.hp + (this.gameState.player.maxHp * multiplier / 100)
      );
    }
  }

  getState(): GameState {
    return this.gameState;
  }

  destroy() {
    this.gameState.isRunning = false;
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
}
