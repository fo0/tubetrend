import {TimeFrame} from '../types';

export interface TimeFrameOption {
  readonly labelKey: string;
  readonly value: TimeFrame;
}

export const TIME_FRAMES: readonly TimeFrameOption[] = [
  { labelKey: 'timeFrames.lastHour', value: TimeFrame.LAST_HOUR },
  { labelKey: 'timeFrames.last3Hours', value: TimeFrame.LAST_3_HOURS },
  { labelKey: 'timeFrames.last5Hours', value: TimeFrame.LAST_5_HOURS },
  { labelKey: 'timeFrames.last12Hours', value: TimeFrame.LAST_12_HOURS },
  { labelKey: 'timeFrames.last24Hours', value: TimeFrame.LAST_24_HOURS },
  { labelKey: 'timeFrames.today', value: TimeFrame.TODAY },
  { labelKey: 'timeFrames.last2Days', value: TimeFrame.LAST_2_DAYS },
  { labelKey: 'timeFrames.last3Days', value: TimeFrame.LAST_3_DAYS },
  { labelKey: 'timeFrames.last4Days', value: TimeFrame.LAST_4_DAYS },
  { labelKey: 'timeFrames.last5Days', value: TimeFrame.LAST_5_DAYS },
  { labelKey: 'timeFrames.last6Days', value: TimeFrame.LAST_6_DAYS },
  { labelKey: 'timeFrames.lastWeek', value: TimeFrame.LAST_WEEK },
  { labelKey: 'timeFrames.last2Weeks', value: TimeFrame.LAST_2_WEEKS },
  { labelKey: 'timeFrames.last3Weeks', value: TimeFrame.LAST_3_WEEKS },
  { labelKey: 'timeFrames.last4Weeks', value: TimeFrame.LAST_4_WEEKS },
  { labelKey: 'timeFrames.lastMonth', value: TimeFrame.LAST_MONTH },
  { labelKey: 'timeFrames.last2Months', value: TimeFrame.LAST_2_MONTHS },
  { labelKey: 'timeFrames.last3Months', value: TimeFrame.LAST_3_MONTHS },
  { labelKey: 'timeFrames.last4Months', value: TimeFrame.LAST_4_MONTHS },
  { labelKey: 'timeFrames.last5Months', value: TimeFrame.LAST_5_MONTHS },
  { labelKey: 'timeFrames.last6Months', value: TimeFrame.LAST_6_MONTHS },
] as const;
