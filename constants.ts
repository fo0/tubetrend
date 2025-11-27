import { TimeFrame } from './types';

export const TIME_FRAMES = [
  { label: '1 Stunde', value: TimeFrame.LAST_HOUR },
  { label: '3 Stunden', value: TimeFrame.LAST_3_HOURS },
  { label: '5 Stunden', value: TimeFrame.LAST_5_HOURS },
  { label: '12 Stunden', value: TimeFrame.LAST_12_HOURS },
  { label: '24 Stunden', value: TimeFrame.LAST_24_HOURS },
  { label: 'Heute', value: TimeFrame.TODAY },
  { label: '2 Tage', value: TimeFrame.LAST_2_DAYS },
  { label: '3 Tage', value: TimeFrame.LAST_3_DAYS },
  { label: '4 Tage', value: TimeFrame.LAST_4_DAYS },
  { label: '5 Tage', value: TimeFrame.LAST_5_DAYS },
  { label: '6 Tage', value: TimeFrame.LAST_6_DAYS },
  { label: '7 Tage', value: TimeFrame.LAST_WEEK },
];

export const MAX_RESULTS_OPTIONS = [
  { label: 'Top 10', value: 10 },
  { label: 'Top 25', value: 25 },
  { label: 'Top 50', value: 50 },
  { label: 'Top 100', value: 100 },
  { label: 'Top 200', value: 200 },
  { label: 'Top 500', value: 500 },
  { label: 'Top 1000', value: 1000 },
  { label: 'Top 2500', value: 2500 },
  { label: 'Top 5000', value: 5000 },
  { label: 'Alle (Kein Limit)', value: 0 },
];

export const PLACEHOLDER_IMAGE = "https://picsum.photos/640/360";