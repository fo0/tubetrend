export interface MaxResultsOption {
  readonly labelKey: string;
  readonly value: number;
  readonly n?: number;
}

export const MAX_RESULTS_OPTIONS: readonly MaxResultsOption[] = [
  { labelKey: 'maxResults.topN', n: 10, value: 10 },
  { labelKey: 'maxResults.topN', n: 25, value: 25 },
  { labelKey: 'maxResults.topN', n: 50, value: 50 },
  { labelKey: 'maxResults.topN', n: 100, value: 100 },
  { labelKey: 'maxResults.topN', n: 200, value: 200 },
  { labelKey: 'maxResults.topN', n: 500, value: 500 },
  { labelKey: 'maxResults.topN', n: 1000, value: 1000 },
  { labelKey: 'maxResults.topN', n: 2500, value: 2500 },
  { labelKey: 'maxResults.topN', n: 5000, value: 5000 },
  { labelKey: 'maxResults.auto', value: -1 },
  { labelKey: 'maxResults.noLimit', value: 0 },
] as const;

// Auto-Modus Limits (zur Quota-Optimierung)
export const AUTO_LIMIT_KEYWORD = 250;
export const AUTO_LIMIT_CHANNEL = 500;
