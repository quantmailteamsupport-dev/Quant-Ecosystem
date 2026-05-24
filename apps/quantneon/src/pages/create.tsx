// ============================================================================
// QuantNeon - Content Creation Page
// ============================================================================

interface CreatePageProps { mode: 'post' | 'reel' | 'story'; selectedMedia: string[]; caption: string; filters: string[]; }

export function CreatePage({ mode, selectedMedia, caption, filters }: CreatePageProps) {
  return {
    type: 'div', props: { className: 'create-page' }, children: [
      { type: 'header', props: {}, children: [{ type: 'button', props: {}, children: ['Cancel'] }, { type: 'h2', props: {}, children: [`New ${mode.charAt(0).toUpperCase() + mode.slice(1)}`] }, { type: 'button', props: { className: 'share-btn' }, children: ['Share'] }] },
      { type: 'div', props: { className: 'media-preview' }, children: selectedMedia.map(url => ({ type: 'img', props: { src: url, className: 'preview-img' }, children: [] })) },
      { type: 'div', props: { className: 'create-form' }, children: [
        { type: 'textarea', props: { placeholder: 'Write a caption...', value: caption }, children: [] },
        { type: 'div', props: { className: 'create-options' }, children: [
          { type: 'button', props: {}, children: ['Tag People'] },
          { type: 'button', props: {}, children: ['Add Location'] },
          { type: 'button', props: {}, children: ['Add Music'] },
          mode === 'reel' ? { type: 'button', props: {}, children: ['Add Effects'] } : null,
        ].filter(Boolean) },
        { type: 'div', props: { className: 'filter-options' }, children: filters.map(f => ({ type: 'button', props: { className: 'filter-btn' }, children: [f] })) },
      ]},
    ],
  };
}
export default CreatePage;
