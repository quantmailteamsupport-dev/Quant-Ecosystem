import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { spring } from '@quant/brand';

export interface ScaleOnHoverProps {
  scale?: number;
  className?: string;
  children: React.ReactNode;
}

export function ScaleOnHover({ scale = 1.02, className, children }: ScaleOnHoverProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      transition={{
        type: 'spring',
        damping: spring.snappy.damping,
        stiffness: spring.snappy.stiffness,
        mass: spring.snappy.mass,
      }}
    >
      {children}
    </motion.div>
  );
}
