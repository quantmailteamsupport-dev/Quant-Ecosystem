import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface AnimatedSkeletonProps {
  variant?: 'text' | 'circle' | 'rect';
  width?: string;
  height?: string;
  className?: string;
}

const variantStyles: Record<string, React.CSSProperties> = {
  text: { borderRadius: '4px', height: '1em', width: '100%' },
  circle: { borderRadius: '50%', width: '40px', height: '40px' },
  rect: { borderRadius: '8px', width: '100%', height: '100px' },
};

export function AnimatedSkeleton({
  variant = 'rect',
  width,
  height,
  className,
}: AnimatedSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const baseStyle = variantStyles[variant];

  const style: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: '#e2e8f0',
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  if (prefersReducedMotion) {
    return <div className={className} style={{ ...style, opacity: 0.7 }} />;
  }

  return (
    <motion.div
      className={className}
      style={style}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
