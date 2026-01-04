import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Bee {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  type: 'working' | 'earning' | 'shopping' | 'flying';
}

const FlyingBees: React.FC = () => {
  const [bees, setBees] = useState<Bee[]>([]);
  
  useEffect(() => {
    // Generate random bees
    const beeTypes: Bee['type'][] = ['working', 'earning', 'shopping', 'flying'];
    const generatedBees: Bee[] = [];
    
    for (let i = 0; i < 12; i++) {
      generatedBees.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 20 + Math.random() * 24,
        delay: Math.random() * 3,
        duration: 8 + Math.random() * 12,
        type: beeTypes[Math.floor(Math.random() * beeTypes.length)]
      });
    }
    
    setBees(generatedBees);
  }, []);
  
  const getBeeEmoji = (type: Bee['type']) => {
    switch (type) {
      case 'working': return '🐝';
      case 'earning': return '💰';
      case 'shopping': return '🛒';
      case 'flying': return '🐝';
      default: return '🐝';
    }
  };
  
  const getRandomPath = (startX: number, startY: number) => {
    // Create a zigzag flying path
    const points = [];
    const numPoints = 6;
    
    for (let i = 0; i <= numPoints; i++) {
      points.push({
        x: startX + (Math.random() * 60 - 30) + (i * 15),
        y: startY + Math.sin(i * Math.PI / 2) * 30 + (Math.random() * 20 - 10)
      });
    }
    
    return points;
  };
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" style={{ contain: 'layout style paint' }}>
      {bees.map((bee) => {
        const path = getRandomPath(bee.x, bee.y);
        
        return (
          <motion.div
            key={bee.id}
            className="absolute"
            initial={{ 
              x: 0,
              y: 0,
              opacity: 0,
              scale: 0
            }}
            animate={{
              x: path.map(p => `${(p.x - bee.x)}%`),
              y: path.map(p => `${(p.y - bee.y)}%`),
              opacity: [0, 1, 1, 1, 1, 0.5, 0],
              scale: [0, 1, 1.1, 1, 1.1, 1, 0.8],
              rotate: [-10, 10, -10, 10, -10, 10, 0]
            }}
            transition={{
              duration: bee.duration,
              delay: bee.delay,
              repeat: Infinity,
              repeatDelay: Math.random() * 2,
              ease: "easeInOut"
            }}
            style={{ fontSize: bee.size, left: `${bee.x}%`, top: `${bee.y}%`, willChange: 'transform, opacity' }}
          >
            <div className="relative">
              <span className="drop-shadow-lg">{getBeeEmoji(bee.type)}</span>
              {/* Wing flutter effect */}
              <motion.div
                className="absolute -top-1 -right-1 text-xs"
                animate={{ 
                  opacity: [0, 0.7, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.15,
                  repeat: Infinity
                }}
              >
                ✨
              </motion.div>
            </div>
          </motion.div>
        );
      })}
      
      {/* Floating honey drops */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`honey-${i}`}
          className="absolute text-lg"
          initial={{
            left: `${10 + Math.random() * 80}%`,
            top: '100%',
            opacity: 0
          }}
          animate={{
            top: [null, '-10%'],
            opacity: [0, 0.8, 0.8, 0],
            rotate: [0, 360]
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            delay: i * 2.5,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          🍯
        </motion.div>
      ))}
      
      {/* Flying coins for earning bees */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`coin-${i}`}
          className="absolute text-sm"
          initial={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            opacity: 0
          }}
          animate={{
            y: [-20, -40, -60],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 2.5,
            delay: i * 3 + 1,
            repeat: Infinity,
            repeatDelay: 5
          }}
        >
          💎
        </motion.div>
      ))}
    </div>
  );
};

export default FlyingBees;
