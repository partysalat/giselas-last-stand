/**
 * 3D collision detection utilities for isometric gameplay
 */

/**
 * Check if a point (with radius) collides with a 3D AABB (Axis-Aligned Bounding Box)
 * Used for player/enemy collision with props
 *
 * @param {number} pointX - Entity world X
 * @param {number} pointY - Entity world Y
 * @param {number} pointZ - Entity world Z (bottom of entity)
 * @param {number} pointRadius - Entity collision radius
 * @param {number} pointHeight - Entity height (for vertical collision)
 * @param {Object} box - AABB object with: { x, y, z, width, depth, height }
 * @returns {boolean} True if collision detected
 */
export function checkPointVsAABB(pointX, pointY, pointZ, pointRadius, pointHeight, box) {
    // Check 2D collision on ground plane (X/Y) with radius
    const halfWidth = box.width / 2;
    const halfDepth = box.depth / 2;

    // Closest point on box to the point
    const closestX = Math.max(box.x - halfWidth, Math.min(pointX, box.x + halfWidth));
    const closestY = Math.max(box.y - halfDepth, Math.min(pointY, box.y + halfDepth));

    // Distance from point to closest point on box
    const distX = pointX - closestX;
    const distY = pointY - closestY;
    const distanceSquared = distX * distX + distY * distY;

    // Check if within radius
    const inFootprint = distanceSquared < (pointRadius * pointRadius);

    if (!inFootprint) {
        return false; // Not even close on ground plane
    }

    // Check height overlap (Z axis)
    const pointTop = pointZ + pointHeight;
    const boxTop = box.z + box.height;

    const heightOverlap = (pointZ < boxTop) && (pointTop > box.z);

    return heightOverlap;
}

/**
 * Check if entity can jump over obstacle
 * @param {number} entityJumpHeight - Current height of entity's center
 * @param {Object} obstacle - Obstacle with volumeHeight property
 * @returns {boolean} True if entity clears the obstacle
 */
export function canJumpOver(entityJumpHeight, obstacle) {
    // Entity needs to be higher than obstacle to clear it
    return entityJumpHeight > obstacle.volumeHeight;
}

/**
 * Check collision between two spheres (for bullet collision)
 * @param {number} x1 - First sphere X
 * @param {number} y1 - First sphere Y
 * @param {number} z1 - First sphere Z
 * @param {number} r1 - First sphere radius
 * @param {number} x2 - Second sphere X
 * @param {number} y2 - Second sphere Y
 * @param {number} z2 - Second sphere Z
 * @param {number} r2 - Second sphere radius
 * @returns {boolean} True if spheres overlap
 */
export function checkSphereVsSphere(x1, y1, z1, r1, x2, y2, z2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const distSquared = dx * dx + dy * dy + dz * dz;
    const radiusSum = r1 + r2;

    return distSquared < (radiusSum * radiusSum);
}

/**
 * Check if a point is inside a 2D rectangle (for footprint checks)
 * @param {number} pointX - Point X
 * @param {number} pointY - Point Y
 * @param {Object} rect - Rectangle with: { x, y, width, height }
 * @returns {boolean} True if point is inside
 */
export function pointInRect(pointX, pointY, rect) {
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;

    return (
        pointX >= rect.x - halfW &&
        pointX <= rect.x + halfW &&
        pointY >= rect.y - halfH &&
        pointY <= rect.y + halfH
    );
}
