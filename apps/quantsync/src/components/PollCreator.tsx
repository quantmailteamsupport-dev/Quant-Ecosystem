// ============================================================================
// QuantSync - PollCreator Component
// Poll creation with options, duration, multiple choice toggle, visibility
// ============================================================================

import React, { useState, useCallback } from 'react';

interface PollOption {
  id: string;
  text: string;
}

interface PollCreatorProps {
  onSubmit: (poll: { options: string[]; duration: string; multipleChoice: boolean; hideResults: boolean }) => void;
  onCancel: () => void;
  maxOptions?: number;
  minOptions?: number;
}

const DURATIONS = [
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
];

const PollCreator: React.FC<PollCreatorProps> = ({ onSubmit, onCancel, maxOptions = 4, minOptions = 2 }) => {
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [duration, setDuration] = useState<string>('1d');
  const [multipleChoice, setMultipleChoice] = useState<boolean>(false);
  const [hideResults, setHideResults] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addOption = useCallback(() => {
    if (options.length >= maxOptions) return;
    setOptions(prev => [...prev, { id: String(Date.now()), text: '' }]);
  }, [options.length, maxOptions]);

  const removeOption = useCallback((id: string) => {
    if (options.length <= minOptions) return;
    setOptions(prev => prev.filter(o => o.id !== id));
  }, [options.length, minOptions]);

  const updateOption = useCallback((id: string, text: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
    setError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    const filledOptions = options.filter(o => o.text.trim());
    if (filledOptions.length < minOptions) {
      setError(`At least ${minOptions} options are required`);
      return;
    }
    const duplicates = filledOptions.some((opt, idx) =>
      filledOptions.findIndex(o => o.text.trim().toLowerCase() === opt.text.trim().toLowerCase()) !== idx
    );
    if (duplicates) {
      setError('Options must be unique');
      return;
    }
    onSubmit({
      options: filledOptions.map(o => o.text.trim()),
      duration,
      multipleChoice,
      hideResults,
    });
  }, [options, duration, multipleChoice, hideResults, minOptions, onSubmit]);

  const isValid = options.filter(o => o.text.trim()).length >= minOptions;

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Create Poll</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
            <input
              type="text"
              value={opt.text}
              onChange={(e) => updateOption(opt.id, e.target.value)}
              placeholder={`Option ${idx + 1}`}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              maxLength={50}
            />
            <span className="text-xs text-gray-300 w-8">{opt.text.length}/50</span>
            {options.length > minOptions && (
              <button onClick={() => removeOption(opt.id)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 text-sm">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < maxOptions && (
        <button onClick={addOption} className="text-blue-500 text-sm font-medium hover:text-blue-700 mb-4 flex items-center gap-1">
          <span>+</span> Add option ({options.length}/{maxOptions})
        </button>
      )}

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Duration</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
            {DURATIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-700">Allow multiple choices</span>
          <div className={`w-10 h-5 rounded-full transition-colors relative ${multipleChoice ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => setMultipleChoice(!multipleChoice)}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${multipleChoice ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-700">Hide results until poll ends</span>
          <div className={`w-10 h-5 rounded-full transition-colors relative ${hideResults ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => setHideResults(!hideResults)}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${hideResults ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t">
        <button onClick={onCancel} className="flex-1 py-2 border rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={!isValid} className="flex-1 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
          Add Poll
        </button>
      </div>
    </div>
  );
};

export default PollCreator;
