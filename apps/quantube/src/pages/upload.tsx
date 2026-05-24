// ============================================================================
// QuantTube - Upload Page
// Content upload and management for creators
// ============================================================================

interface UploadPageProps {
  isUploading: boolean;
  progress: number;
  uploadedVideos: { id: string; title: string; status: string }[];
}

export function UploadPage({ isUploading, progress, uploadedVideos }: UploadPageProps) {
  return {
    type: 'div',
    props: { className: 'upload-page' },
    children: [
      { type: 'h1', props: {}, children: ['Upload Content'] },
      { type: 'div', props: { className: 'upload-zone' }, children: [
        isUploading ? renderProgressBar(progress) : renderDropZone(),
      ]},
      { type: 'form', props: { className: 'upload-details' }, children: [
        { type: 'input', props: { type: 'text', placeholder: 'Title', className: 'input-title' }, children: [] },
        { type: 'textarea', props: { placeholder: 'Description', className: 'input-description' }, children: [] },
        { type: 'select', props: { className: 'input-type' }, children: [
          { type: 'option', props: { value: 'video' }, children: ['Video'] },
          { type: 'option', props: { value: 'short' }, children: ['Short'] },
          { type: 'option', props: { value: 'premiere' }, children: ['Premiere'] },
        ]},
        { type: 'input', props: { type: 'text', placeholder: 'Tags (comma separated)' }, children: [] },
        { type: 'select', props: { className: 'visibility' }, children: [
          { type: 'option', props: { value: 'public' }, children: ['Public'] },
          { type: 'option', props: { value: 'unlisted' }, children: ['Unlisted'] },
          { type: 'option', props: { value: 'private' }, children: ['Private'] },
        ]},
        { type: 'button', props: { type: 'submit', className: 'btn-publish' }, children: ['Publish'] },
      ]},
      { type: 'section', props: { className: 'recent-uploads' }, children: [
        { type: 'h2', props: {}, children: ['Recent Uploads'] },
        { type: 'div', props: {}, children: uploadedVideos.map(v => ({ type: 'div', props: { className: 'upload-item' }, children: [{ type: 'span', props: {}, children: [v.title] }, { type: 'span', props: { className: `status-${v.status}` }, children: [v.status] }] })) },
      ]},
    ],
  };
}

function renderDropZone() {
  return { type: 'div', props: { className: 'drop-zone' }, children: [{ type: 'p', props: {}, children: ['Drag & drop your file here or click to browse'] }, { type: 'input', props: { type: 'file', accept: 'video/*,audio/*' }, children: [] }] };
}

function renderProgressBar(progress: number) {
  return { type: 'div', props: { className: 'upload-progress' }, children: [{ type: 'div', props: { className: 'progress-bar', style: `width: ${progress}%` }, children: [] }, { type: 'span', props: {}, children: [`${Math.round(progress)}%`] }] };
}

export default UploadPage;
