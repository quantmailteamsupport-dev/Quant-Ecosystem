import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { spring } from '@quant/brand';

export interface StaggerListProps {
  staggerDelay?: number;
  className?: string;
  children: React.ReactNode;
}

const containerVariants = (staggerDelay: number) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: spring.gentle.damping,
      stiffness: spring.gentle.stiffness,
      mass: spring.gentle.mass,
    },
  },
};

export function StaggerList({ staggerDelay = 0.05, className, children }: StaggerListProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants(staggerDelay)}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
