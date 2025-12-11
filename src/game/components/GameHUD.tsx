import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Heart, Shield, Zap, Clock, Skull, Star, Settings } from 'lucide-react';
import { GameState, PlayerEntity } from '../types';

interface GameHUDProps {
  gameState: GameState;
  onPause: () => void;
  onOpenSettings: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ gameState, onPause, onOpenSettings }) => {
  const player = gameState.player;
  if (!player) return null;

  const hpPercent = (player.hp / player.maxHp) * 100;
  const timeMinutes = Math.floor(gameState.timeRemaining / 60);
  const timeSeconds = Math.floor(gameState.timeRemaining % 60);

  const getSkillCooldownPercent = (cooldown: number, maxCooldown: number) => {
    return Math.max(0, (cooldown / maxCooldown) * 100);
  };

  return (
    <div className="absolute inset-x-0 top-0 p-2 pointer-events-none">
      <div className="max-w-4xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between bg-black/60 backdrop-blur rounded-lg p-2 pointer-events-auto">
          {/* Player Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center">
              <span className="font-bold text-sm">{player.level}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <Progress value={hpPercent} className="w-24 h-2" />
                <span className="text-xs">{Math.ceil(player.hp)}/{player.maxHp}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  {player.attack}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-500" />
                  {player.defense}
                </span>
              </div>
            </div>
          </div>

          {/* Level Info */}
          <div className="text-center">
            <p className="font-bold text-sm">{gameState.level?.name}</p>
            <div className="flex items-center gap-2 justify-center">
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {timeMinutes}:{timeSeconds.toString().padStart(2, '0')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Skull className="w-3 h-3 mr-1" />
                {gameState.killCount}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                {gameState.score}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              onClick={onOpenSettings}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              className="px-3 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors text-sm"
              onClick={onPause}
            >
              Pause
            </button>
          </div>
        </div>

        {/* Skill Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur rounded-lg p-2 pointer-events-auto">
          {/* Skill 1 */}
          <div className="relative">
            <div className={`w-12 h-12 rounded-lg border-2 ${
              player.skill1Cooldown <= 0 ? 'border-primary bg-primary/20' : 'border-muted bg-muted/50'
            } flex items-center justify-center`}>
              <span className="font-bold">Q</span>
            </div>
            {player.skill1Cooldown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <span className="text-xs">{Math.ceil(player.skill1Cooldown)}</span>
              </div>
            )}
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap">
              {player.hero.skill1.name}
            </span>
          </div>

          {/* Skill 2 */}
          <div className="relative">
            <div className={`w-12 h-12 rounded-lg border-2 ${
              player.skill2Cooldown <= 0 ? 'border-primary bg-primary/20' : 'border-muted bg-muted/50'
            } flex items-center justify-center`}>
              <span className="font-bold">W</span>
            </div>
            {player.skill2Cooldown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <span className="text-xs">{Math.ceil(player.skill2Cooldown)}</span>
              </div>
            )}
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap">
              {player.hero.skill2.name}
            </span>
          </div>

          {/* Ultimate */}
          <div className="relative">
            <div className={`w-14 h-14 rounded-lg border-2 ${
              player.ultimateCooldown <= 0 ? 'border-yellow-500 bg-yellow-500/20' : 'border-muted bg-muted/50'
            } flex items-center justify-center`}>
              <span className="font-bold">R</span>
            </div>
            {player.ultimateCooldown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <span className="text-xs">{Math.ceil(player.ultimateCooldown)}</span>
              </div>
            )}
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-yellow-500">
              {player.hero.ultimate.name}
            </span>
          </div>
        </div>

        {/* Active Buffs */}
        {player.activeBuffs.length > 0 && (
          <div className="absolute top-16 right-2 flex flex-col gap-1">
            {player.activeBuffs.map((buff, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {buff.type} x{buff.multiplier.toFixed(1)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHUD;
