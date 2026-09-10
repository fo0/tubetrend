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

// Hooks
export { useDashboardFilters } from "./hooks/useDashboardFilters";
export { useHighlightsCopyAll } from "./hooks/useHighlightsCopyAll";
export { useQuickJumpFocus } from "./hooks/useQuickJumpFocus";
export { useUndoHiddenHighlight, type LastHiddenHighlight } from "./hooks/useUndoHiddenHighlight";

// Components
export { DashboardDropOverlay } from "./components/DashboardDropOverlay";
export { DashboardFavoritesList } from "./components/DashboardFavoritesList";
export { DashboardHighlightsGrid } from "./components/DashboardHighlightsGrid";
export { DashboardHighlightsLiveRegion } from "./components/DashboardHighlightsLiveRegion";
export { DashboardHighlightsToolbar } from "./components/DashboardHighlightsToolbar";
export { DashboardSortingControls } from "./components/DashboardSortingControls";
