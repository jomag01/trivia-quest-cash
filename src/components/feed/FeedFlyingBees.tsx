import React, { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';

interface Bee {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

// Lightweight flying bees component optimized for feed background
const FeedFlyingBees: React.FC = memo(function FeedFlyingBees() {
  const [bees, setBees] = useState<Bee[]>([]);
  
  useEffect(() => {
    // Generate fewer bees for performance - light themed
    const generatedBees: Bee[] = [];
    
    for (let i = 0; i < 8; i++) {
      generatedBees.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 16 + Math.random() * 12,
        delay: Math.random() * 4,
        duration: 12 + Math.random() * 8
      });
    }
    
    setBees(generatedBees);
  }, []);
  
  const getRandomPath = (startX: number, startY: number) => {
    const points = [];
    const numPoints = 5;
    
    for (let i = 0; i <= numPoints; i++) {
      points.push({
        x: startX + (Math.random() * 40 - 20) + (i * 10),
        y: startY + Math.sin(i * Math.PI / 2) * 20 + (Math.random() * 15 - 7)
      });
    }
    
    return points;
  };
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-500/5" />
      
      {bees.map((bee) => {
        const path = getRandomPath(bee.x, bee.y);
        
        return (
          <motion.div
            key={bee.id}
            className="absolute"
            initial={{ 
              left: `${bee.x}%`, 
              top: `${bee.y}%`,
              opacity: 0,
              scale: 0
            }}
            animate={{
              left: path.map(p => `${Math.min(100, Math.max(0, p.x))}%`),
              top: path.map(p => `${Math.min(100, Math.max(0, p.y))}%`),
              opacity: [0, 0.6, 0.6, 0.6, 0.4, 0],
              scale: [0, 1, 1.05, 1, 1.05, 0.8],
              rotate: [-5, 5, -5, 5, -5, 0]
            }}
            transition={{
              duration: bee.duration,
              delay: bee.delay,
              repeat: Infinity,
              repeatDelay: Math.random() * 3,
              ease: "easeInOut"
            }}
            style={{ fontSize: bee.size }}
          >
            <div className="relative drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
              <span className="text-amber-200/80">🐝</span>
              {/* Soft glow */}
              <motion.div
                className="absolute -top-0.5 -right-0.5 text-[8px] text-amber-300/60"
                animate={{ 
                  opacity: [0, 0.5, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.2,
                  repeat: Infinity
                }}
              >
                ✨
              </motion.div>
            </div>
          </motion.div>
        );
      })}
      
      {/* Floating honey particles - light colored */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full bg-amber-300/30"
          initial={{
            left: `${10 + Math.random() * 80}%`,
            top: '100%',
            opacity: 0
          }}
          animate={{
            top: [null, '-5%'],
            opacity: [0, 0.4, 0.4, 0]
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            delay: i * 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
      
      {/* Subtle hexagon shapes floating */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`hex-${i}`}
          className="absolute w-8 h-8 border border-amber-400/10 rotate-45"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            background: 'linear-gradient(135deg, rgba(251,191,36,0.05) 0%, transparent 100%)'
          }}
          initial={{
            left: `${15 + i * 20}%`,
            top: `${20 + (i % 2) * 40}%`,
            opacity: 0,
            rotate: 0
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0, 0.3, 0],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 15,
            delay: i * 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
});

export default FeedFlyingBees;
