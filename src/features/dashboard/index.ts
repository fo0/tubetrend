/**
 * Dashboard feature module
 */

// Services
export { hiddenHighlightsService, type HiddenHighlight } from "./services/hiddenHighlightsService";
export {
  dashboardBackupService,
  type DashboardBackupPayload,
} from "./services/dashboardBackupService";
export {
  selectHighlightVideosFromFavorites,
  type HighlightItem,
} from "./services/dashboardTopVideos";
