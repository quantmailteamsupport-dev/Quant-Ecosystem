// ============================================================================
// QuantEdits - useBrandKit Hook
// Brand kit state: load kits, apply brand, check consistency
// ============================================================================

import { useState, useCallback } from 'react';

interface BrandKit {
  id: string;
  name: string;
  isDefault: boolean;
  colors: { primary: string; secondary: string; accent: string; background: string; text: string };
  fonts: { heading: string; body: string; accent: string };
  logos: { id: string; url: string; variant: string }[];
}

interface ConsistencyIssue {
  element: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
}

interface UseBrandKitReturn {
  kits: BrandKit[];
  activeKit: BrandKit | null;
  issues: ConsistencyIssue[];
  isLoading: boolean;
  loadKits: () => Promise<void>;
  setActiveKit: (kitId: string) => void;
  applyToProject: (elements: unknown[]) => Promise<{ applied: number; skipped: number }>;
  checkConsistency: (elements: unknown[]) => Promise<ConsistencyIssue[]>;
  createKit: (name: string) => Promise<BrandKit>;
  deleteKit: (kitId: string) => Promise<void>;
}

export function useBrandKit(): UseBrandKitReturn {
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [activeKit, setActiveKitState] = useState<BrandKit | null>(null);
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadKits = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    const mockKits: BrandKit[] = [
      { id: 'kit-1', name: 'Primary Brand', isDefault: true, colors: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#10b981', background: '#ffffff', text: '#1f2937' }, fonts: { heading: 'Inter', body: 'Inter', accent: 'Fira Code' }, logos: [{ id: 'l1', url: '/logos/primary.png', variant: 'primary' }] },
      { id: 'kit-2', name: 'Dark Theme', isDefault: false, colors: { primary: '#ec4899', secondary: '#f97316', accent: '#06b6d4', background: '#0f172a', text: '#f8fafc' }, fonts: { heading: 'Poppins', body: 'Inter', accent: 'JetBrains Mono' }, logos: [] },
    ];
    setKits(mockKits);
    setActiveKitState(mockKits.find(k => k.isDefault) || mockKits[0]);
    setIsLoading(false);
  }, []);

  const setActiveKit = useCallback((kitId: string) => {
    const kit = kits.find(k => k.id === kitId);
    if (kit) setActiveKitState(kit);
  }, [kits]);

  const applyToProject = useCallback(async (elements: unknown[]): Promise<{ applied: number; skipped: number }> => {
    if (!activeKit) return { applied: 0, skipped: 0 };
    await new Promise(r => setTimeout(r, 200));
    return { applied: Math.floor(elements.length * 0.7), skipped: Math.ceil(elements.length * 0.3) };
  }, [activeKit]);

  const checkConsistency = useCallback(async (elements: unknown[]): Promise<ConsistencyIssue[]> => {
    if (!activeKit) return [];
    await new Promise(r => setTimeout(r, 200));
    const newIssues: ConsistencyIssue[] = [
      { element: 'text-1', issue: 'Font not in brand kit', severity: 'warning', suggestion: `Use ${activeKit.fonts.heading}` },
      { element: 'shape-3', issue: 'Color not in palette', severity: 'info', suggestion: `Use brand primary ${activeKit.colors.primary}` },
    ];
    setIssues(newIssues);
    return newIssues;
  }, [activeKit]);

  const createKit = useCallback(async (name: string): Promise<BrandKit> => {
    const newKit: BrandKit = { id: `kit-${Date.now()}`, name, isDefault: false, colors: { primary: '#000000', secondary: '#333333', accent: '#666666', background: '#ffffff', text: '#000000' }, fonts: { heading: 'Inter', body: 'Inter', accent: 'monospace' }, logos: [] };
    setKits(prev => [...prev, newKit]);
    return newKit;
  }, []);

  const deleteKit = useCallback(async (kitId: string) => {
    setKits(prev => prev.filter(k => k.id !== kitId));
    if (activeKit?.id === kitId) setActiveKitState(null);
  }, [activeKit]);

  return { kits, activeKit, issues, isLoading, loadKits, setActiveKit, applyToProject, checkConsistency, createKit, deleteKit };
}

export default useBrandKit;
