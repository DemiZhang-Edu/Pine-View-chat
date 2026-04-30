import React, { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { MessageSquare } from 'lucide-react';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function Logo({ collapsed = false, className = '', size = 'md', interactive = false }: LogoProps) {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  const iconSize = isLarge ? 28 : isSmall ? 14 : 18;
  const boxSize = isLarge ? 'w-14 h-14' : isSmall ? 'w-7 h-7' : 'w-10 h-10';
  const textSize = isLarge ? 'text-3xl' : 'text-xl';
  const subTextSize = isLarge ? 'text-[11px]' : 'text-[9px]';

  // Tilt Effect Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      className={`flex items-center gap-3 ${interactive ? 'cursor-none select-none' : 'cursor-default'} ${className}`}
      initial="initial"
      whileHover="hover"
      animate="animate"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000
      }}
    >
      <div className="relative group">
        <motion.div 
          className={`${boxSize} bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 z-10 relative overflow-hidden`}
          style={interactive ? {
            rotateX,
            rotateY,
            transformStyle: "preserve-3d"
          } : {}}
          variants={{
            initial: { rotate: 0, y: 0 },
            hover: { 
              scale: 1.1,
              transition: { type: "spring", stiffness: 400, damping: 10 }
            }
          }}
        >
          {/* Animated Shine */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full"
            variants={{
              animate: {
                x: ['-100%', '200%'],
              }
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 1.5
            }}
          />

          {/* Inner Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.4),transparent_70%)]" />

          <motion.div
            style={interactive ? {
              translateZ: 20
            } : {}}
          >
            <MessageSquare size={iconSize} strokeWidth={2.5} />
          </motion.div>
        </motion.div>
        
        {/* Decorative elements */}
        <AnimatePresence>
          <motion.div 
            className="absolute -inset-2 bg-indigo-500/20 blur-xl -z-10 rounded-full"
            variants={{
              initial: { scale: 0.8, opacity: 0 },
              hover: { scale: 1.2, opacity: 0.6 }
            }}
          />
        </AnimatePresence>
        
        {/* Floating particles on hover - only if interactive */}
        {interactive && (
          <>
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-violet-400 rounded-full blur-[2px]"
              variants={{
                initial: { opacity: 0 },
                hover: { opacity: 0.8, scale: [0, 1.2, 0], x: [0, 20, 30], y: [0, -20, -15] }
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-1 -left-1 w-2 h-2 bg-indigo-400 rounded-full blur-[1px]"
              variants={{
                initial: { opacity: 0 },
                hover: { opacity: 0.6, scale: [0, 1, 0], x: [0, -15, -25], y: [0, 15, 10] }
              }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
            />
          </>
        )}
      </div>

      {!collapsed && (
        <div className="flex flex-col leading-none">
          <motion.div 
            className={`${textSize} font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-0.5`}
            style={interactive ? {
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
              translateZ: 10
            } : {}}
            variants={{
              hover: { x: 4 }
            }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
              PV
            </span>
            <span className="text-indigo-600 font-black relative">
              CHAT
              <motion.div 
                className="absolute -bottom-1 left-0 right-0 h-1 bg-indigo-600/20 rounded-full"
                initial={{ width: 0 }}
                variants={{
                  hover: { width: '100%' }
                }}
              />
            </span>
          </motion.div>
          <motion.span 
            className={`${subTextSize} font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500 mt-1`}
            variants={{
              hover: { opacity: 0.8, x: 2 }
            }}
          >
            Communication
          </motion.span>
        </div>
      )}

      {/* Custom Cursor for interactive Logo */}
      {interactive && (
        <motion.div 
          className="fixed w-4 h-4 bg-indigo-500 rounded-full blur-[2px] pointer-events-none z-[100] mix-blend-difference"
          style={{
            x: useSpring(useTransform(x, [-0.5, 0.5], [-50, 50]), { damping: 25, stiffness: 200 }),
            y: useSpring(useTransform(y, [-0.5, 0.5], [-50, 50]), { damping: 25, stiffness: 200 }),
            left: '50%',
            top: '50%'
          }}
        />
      )}
    </motion.div>
  );
}
