/**
 * Shared layout constants for resizable panel layouts
 * Used by tasks.tsx, requests.tsx, and similar list-detail views
 */

// Panel sizes for mobile/tablet
export const PANEL_MOBILE_SIZE = 40;

// Panel sizes for extra large screens (>1280px)
export const PANEL_XL_SIZE = 25;

// Default panel size for desktop
export const PANEL_DEFAULT_SIZE = 35;

// Panel constraints
export const PANEL_MIN_SIZE = 25;
export const PANEL_MAX_SIZE = 50;

// Detail panel sizes
export const DETAIL_PANEL_TABLET_SIZE = 60;
export const DETAIL_PANEL_XL_SIZE = 75;
export const DETAIL_PANEL_DEFAULT_SIZE = 65;
export const DETAIL_PANEL_MIN_SIZE = 50;

/**
 * Get the appropriate list panel size based on screen size
 */
export function getListPanelSize(
	isTablet: boolean,
	isExtraLarge: boolean,
): number {
	if (isTablet) return PANEL_MOBILE_SIZE;
	if (isExtraLarge) return PANEL_XL_SIZE;
	return PANEL_DEFAULT_SIZE;
}

/**
 * Get the appropriate detail panel size based on screen size
 */
export function getDetailPanelSize(
	isTablet: boolean,
	isExtraLarge: boolean,
): number {
	if (isTablet) return DETAIL_PANEL_TABLET_SIZE;
	if (isExtraLarge) return DETAIL_PANEL_XL_SIZE;
	return DETAIL_PANEL_DEFAULT_SIZE;
}
