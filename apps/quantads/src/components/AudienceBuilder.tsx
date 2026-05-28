// ============================================================================
// QuantAds - AudienceBuilder Component
// Visual audience targeting builder
// ============================================================================

import type { TargetingConfig } from '../types';

interface AudienceBuilderProps {
  targeting?: TargetingConfig;
  onChange?: (targeting: TargetingConfig) => void;
  estimatedReach?: number;
}

export function AudienceBuilder({
  targeting,
  onChange: _onChange,
  estimatedReach = 0,
}: AudienceBuilderProps) {
  const defaultTargeting: TargetingConfig = targeting || {
    demographics: {
      ageMin: 18,
      ageMax: 65,
      genders: ['all'],
      languages: ['en'],
      educationLevels: [],
      incomeRanges: [],
    },
    interests: [],
    behaviors: [],
    locations: [],
    devices: {
      platforms: ['ios', 'android', 'web', 'desktop'],
      osVersions: [],
      deviceTypes: ['mobile', 'tablet', 'desktop'],
      connectionTypes: ['all'],
    },
    custom: [],
    exclusions: [],
  };

  return (
    <div
      className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      role="form"
      aria-label="Audience targeting builder"
    >
      {/* Reach Estimate */}
      <div className="rounded-lg bg-indigo-50 p-4">
        <h4 className="mb-1 text-sm font-semibold text-gray-900">Estimated Audience Size</h4>
        <span className="text-2xl font-bold text-indigo-600" aria-live="polite">
          {formatReach(estimatedReach)}
        </span>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-label="Audience reach gauge"
          aria-valuenow={Math.min((estimatedReach / 10000000) * 100, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${Math.min((estimatedReach / 10000000) * 100, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>Specific</span>
          <span>Broad</span>
        </div>
      </div>

      {/* Demographics */}
      <section aria-labelledby="demographics-heading">
        <h3 id="demographics-heading" className="mb-3 text-sm font-semibold text-gray-900">
          Demographics
        </h3>
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-600">Age Range</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={13}
              max={65}
              defaultValue={defaultTargeting.demographics.ageMin}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-indigo-600"
              aria-label="Age range slider"
            />
            <span className="min-w-[80px] text-center text-xs font-medium text-gray-700">
              {defaultTargeting.demographics.ageMin} - {defaultTargeting.demographics.ageMax}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-600">Gender</label>
          <div className="flex gap-2">
            {(['all', 'male', 'female', 'other'] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                  defaultTargeting.demographics.genders.includes(g)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                }`}
                aria-pressed={defaultTargeting.demographics.genders.includes(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Interests */}
      <section aria-labelledby="interests-heading">
        <h3 id="interests-heading" className="mb-3 text-sm font-semibold text-gray-900">
          Interests
        </h3>
        <input
          type="text"
          placeholder="Search interests..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Search interests"
        />
        {defaultTargeting.interests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {defaultTargeting.interests.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Locations */}
      <section aria-labelledby="locations-heading">
        <h3 id="locations-heading" className="mb-3 text-sm font-semibold text-gray-900">
          Locations
        </h3>
        <input
          type="text"
          placeholder="Search countries, cities..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Search locations"
        />
        {defaultTargeting.locations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {defaultTargeting.locations.map((loc) => (
              <span
                key={loc.value}
                className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {loc.value}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Devices & Platforms */}
      <section aria-labelledby="devices-heading">
        <h3 id="devices-heading" className="mb-3 text-sm font-semibold text-gray-900">
          Devices &amp; Platforms
        </h3>
        <div className="flex flex-wrap gap-2">
          {(['ios', 'android', 'web', 'desktop'] as const).map((platform) => (
            <button
              key={platform}
              type="button"
              className={`min-h-[44px] rounded-lg border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                defaultTargeting.devices.platforms.includes(platform)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
              }`}
              aria-pressed={defaultTargeting.devices.platforms.includes(platform)}
            >
              {platform}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatReach(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M people`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K people`;
  return `${n} people`;
}

export default AudienceBuilder;
