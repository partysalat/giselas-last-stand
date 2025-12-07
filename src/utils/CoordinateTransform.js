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

/**
 * Convert world coordinates to screen (pixel) coordinates
 * @param {number} worldX - World X position
 * @param {number} worldY - World Y position (depth)
 * @param {number} worldZ - World Z position (height)
 * @returns {{screenX: number, screenY: number}}
 */
export function worldToScreen(worldX, worldY, worldZ = 0) {
    // Classic isometric projection formula
    const screenX = (worldX - worldY) * TILE_WIDTH_HALF;
    const screenY = (worldX + worldY) * TILE_HEIGHT_HALF - worldZ;

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
    // Inverse isometric projection
    // Adjust screenY for height before converting
    const adjustedScreenY = screenY + worldZ;

    const worldX = (screenX / TILE_WIDTH_HALF + adjustedScreenY / TILE_HEIGHT_HALF) / 2;
    const worldY = (adjustedScreenY / TILE_HEIGHT_HALF - screenX / TILE_WIDTH_HALF) / 2;

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
