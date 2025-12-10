/**
 * Coordinate transformation utilities for isometric projection
 *
 * World Space: 3D coordinates (worldX, worldY, worldZ)
 *   - worldX: horizontal axis (right = positive)
 *   - worldY: depth axis (down = positive)
 *   - worldZ: height axis (up = positive)
 *
 * Screen Space: 2D pixel coordinates (screenX, screenY)
 *   - Calculated from world space for rendering
 */

// Isometric tile dimensions (2:1 ratio for classic isometric)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const TILE_WIDTH_HALF = TILE_WIDTH / 2;  // 32
export const TILE_HEIGHT_HALF = TILE_HEIGHT / 2; // 16

// World unit scale (how many world units = 1 tile)
// This affects movement speed feel - adjust after testing
export const WORLD_SCALE = 1.0;

// Conversion between pixels and world units
// Used for converting legacy pixel-based dimensions to world units
export const PIXELS_PER_WORLD_UNIT = 50; // 1 world unit = 50 pixels
export const worldUnitsFromPixels = (pixels) => pixels / PIXELS_PER_WORLD_UNIT;
export const pixelsFromWorldUnits = (worldUnits) => worldUnits * PIXELS_PER_WORLD_UNIT;

// Screen origin offset to center the isometric view
// Viewport is 1920x1080, center at (960, 540)
// World center (15, 12) should map to screen center
// World (15, 12) in isometric: isoX = (15-12)*32 = 96, isoY = (15+12)*16 = 432
// So origin offset = screen_center - iso_coords = (960-96, 540-432) = (864, 108)
export const SCREEN_ORIGIN_X = 864;
export const SCREEN_ORIGIN_Y = 108;

// World space bounds (for clamping entities)
export const WORLD_MIN_X = 0;
export const WORLD_MAX_X = 30;
export const WORLD_MIN_Y = 0;
export const WORLD_MAX_Y = 25;

/**
 * Convert world coordinates to screen (pixel) coordinates
 * @param {number} worldX - World X position
 * @param {number} worldY - World Y position (depth)
 * @param {number} worldZ - World Z position (height)
 * @returns {{screenX: number, screenY: number}}
 */
export function worldToScreen(worldX, worldY, worldZ = 0) {
    // Classic isometric projection formula
    const isoX = (worldX - worldY) * TILE_WIDTH_HALF;
    const isoY = (worldX + worldY) * TILE_HEIGHT_HALF - worldZ;

    // Add origin offset to center the view
    const screenX = isoX + SCREEN_ORIGIN_X;
    const screenY = isoY + SCREEN_ORIGIN_Y;

    return { screenX, screenY };
}

/**
 * Convert screen coordinates to world coordinates
 * Assumes worldZ = 0 (ground level) unless specified
 * @param {number} screenX - Screen X pixel position
 * @param {number} screenY - Screen Y pixel position
 * @param {number} worldZ - Assumed world Z position (default 0)
 * @returns {{worldX: number, worldY: number, worldZ: number}}
 */
export function screenToWorld(screenX, screenY, worldZ = 0) {
    // Remove origin offset first
    const isoX = screenX - SCREEN_ORIGIN_X;
    const isoY = screenY - SCREEN_ORIGIN_Y;

    // Inverse isometric projection
    // Adjust isoY for height before converting
    const adjustedIsoY = isoY + worldZ;

    const worldX = (isoX / TILE_WIDTH_HALF + adjustedIsoY / TILE_HEIGHT_HALF) / 2;
    const worldY = (adjustedIsoY / TILE_HEIGHT_HALF - isoX / TILE_WIDTH_HALF) / 2;

    return { worldX, worldY, worldZ };
}

/**
 * Calculate depth value for isometric sorting
 * Objects further down/right should render on top
 * @param {number} worldY - World Y position (depth)
 * @returns {number} Depth value for Phaser's setDepth()
 */
export function calculateDepth(worldY, baseDepth = 0) {
    // Higher worldY = further down screen = higher depth
    return baseDepth + worldY;
}

/**
 * Get distance between two world-space points (3D)
 * @param {number} x1 - First point worldX
 * @param {number} y1 - First point worldY
 * @param {number} z1 - First point worldZ
 * @param {number} x2 - Second point worldX
 * @param {number} y2 - Second point worldY
 * @param {number} z2 - Second point worldZ
 * @returns {number} Distance in world units
 */
export function worldDistance3D(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Get distance between two world-space points (2D ground plane only)
 * @param {number} x1 - First point worldX
 * @param {number} y1 - First point worldY
 * @param {number} x2 - Second point worldX
 * @param {number} y2 - Second point worldY
 * @returns {number} Distance in world units
 */
export function worldDistance2D(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}
