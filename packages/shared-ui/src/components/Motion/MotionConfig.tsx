import React, { createContext, useContext } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface MotionConfigContextValue {
  shouldAnimate: boolean;
}

const MotionConfigContext = createContext<MotionConfigContextValue>({
  shouldAnimate: true,
});

export interface MotionProviderProps {
  children: React.ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  return (
    <MotionConfigContext.Provider value={{ shouldAnimate }}>
      {children}
    </MotionConfigContext.Provider>
  );
}

export function useMotionConfig(): MotionConfigContextValue {
  return useContext(MotionConfigContext);
}
