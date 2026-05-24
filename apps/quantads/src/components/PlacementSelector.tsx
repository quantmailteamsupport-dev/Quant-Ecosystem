// ============================================================================
// QuantAds - PlacementSelector Component
// Select ad placements across ecosystem apps
// ============================================================================

interface PlacementSelectorProps {
  selected: string[];
  onChange?: (placements: string[]) => void;
}

const ECOSYSTEM_APPS = [
  { id: 'quantsync', name: 'QuantSync', icon: 'sync', placements: ['feed', 'sidebar', 'stories', 'banner'] },
  { id: 'quantchat', name: 'QuantChat', icon: 'chat', placements: ['stories', 'discover', 'banner'] },
  { id: 'quantube', name: 'QuantTube', icon: 'video', placements: ['pre-roll', 'mid-roll', 'sidebar', 'banner'] },
  { id: 'quantneon', name: 'QuantNeon', icon: 'camera', placements: ['feed', 'stories', 'explore', 'banner'] },
  { id: 'quantmax', name: 'QuantMax', icon: 'play', placements: ['feed', 'between-videos', 'banner'] },
  { id: 'quantmail', name: 'QuantMail', icon: 'mail', placements: ['sidebar', 'banner', 'native'] },
  { id: 'quantedits', name: 'QuantEdits', icon: 'edit', placements: ['sidebar', 'banner'] },
  { id: 'quantai', name: 'QuantAI', icon: 'brain', placements: ['sidebar', 'native'] },
];

export function PlacementSelector({ selected, onChange }: PlacementSelectorProps) {
  function togglePlacement(appId: string, placement: string): void {
    const key = `${appId}:${placement}`;
    const newSelected = selected.includes(key)
      ? selected.filter(s => s !== key)
      : [...selected, key];
    onChange?.(newSelected);
  }

  return {
    type: 'div',
    className: 'placement-selector',
    children: [
      { type: 'h3', text: 'Select Placements' },
      { type: 'p', className: 'description', text: 'Choose where your ads will appear across the Quant ecosystem' },
      { type: 'div', className: 'apps-grid', children: ECOSYSTEM_APPS.map(app => ({
        type: 'div',
        className: 'app-placements',
        children: [
          { type: 'div', className: 'app-header', children: [
            { type: 'span', className: `app-icon icon-${app.icon}` },
            { type: 'span', className: 'app-name', text: app.name },
          ] },
          { type: 'div', className: 'placement-options', children: app.placements.map(p => ({
            type: 'label',
            className: `placement-option ${selected.includes(`${app.id}:${p}`) ? 'selected' : ''}`,
            children: [
              { type: 'input', type_attr: 'checkbox', checked: selected.includes(`${app.id}:${p}`) },
              { type: 'span', text: p },
            ],
            onClick: () => togglePlacement(app.id, p),
          })) },
        ],
      })) },
      { type: 'div', className: 'selection-summary', text: `${selected.length} placements selected` },
    ],
  };
}

export default PlacementSelector;
