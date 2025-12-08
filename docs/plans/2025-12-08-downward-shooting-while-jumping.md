# Downward Shooting While Jumping

**Date**: 2025-12-08
**Status**: Approved

## Overview
Enable players to shoot downward at ground-level enemies while jumping, with bullets following a 3D trajectory that arcs due to gravity.

## Requirements
- When airborne (worldZ > 0), bullets aim at enemy's center height in 3D space
- Bullets travel with gravity applied (arcing downward path)
- When grounded (worldZ = 0), maintain current behavior (no vertical component)

## Core Behavior

### Trajectory Calculation
1. Calculate 3D vector from player position to target's center height
2. Set initial bullet velocity in X, Y, and Z directions
3. Apply gravity to Z velocity each frame
4. Bullet follows arcing path to target

### Target Height Determination
- **Regular enemies**: `enemy.worldZ + enemy.height / 2`
- **Tentacles**: Estimate based on tentacle sprite position
- **Props**: `prop.worldZ + prop.volumeHeight / 2`

### Gravity Application
- Use `ISOMETRIC_CONFIG.GRAVITY` constant (same as player jumping)
- Applied every frame: `velocityZ += GRAVITY * deltaSeconds`
- Only active when player shoots while airborne

## Technical Design

### Bullet Class Changes (`src/entities/Bullet.js`)
1. Add `hasGravity` boolean flag (default: false)
2. Constructor accepts initial `velocityZ` parameter
3. In `update()`: if `hasGravity`, apply gravity to `velocityZ`
4. Add ground collision: destroy bullet if `worldZ <= 0` during flight
5. Collision detection already handles height ranges (no changes needed)

### Player.shoot() Changes (`src/entities/Player.js`)
1. Check if player is airborne: `if (this.worldZ > 0)`
2. Calculate target height based on enemy type
3. Calculate 3D distance and velocity components:
   ```javascript
   const dx = targetWorld.worldX - this.worldX;
   const dy = targetWorld.worldY - this.worldY;
   const dz = targetHeight - (this.worldZ + 20); // 20 = chest height
   const distance2D = Math.sqrt(dx * dx + dy * dy);

   const horizontalSpeed = ISOMETRIC_CONFIG.BULLET_SPEED;
   const velocityX = (dx / distance2D) * horizontalSpeed;
   const velocityY = (dy / distance2D) * horizontalSpeed;
   const velocityZ = (dz / distance2D) * horizontalSpeed;
   ```
4. Pass `velocityZ` to Bullet constructor
5. Set `bullet.hasGravity = true` for airborne shots
6. When grounded, use current behavior (velocityZ = 0, no gravity)

### Config Changes (`src/config.js`)
- Optional: Add `BULLET_GRAVITY` if default gravity is too strong
- Can tune separately from player jump gravity

## Edge Cases
1. **Bullet hits ground**: Destroy if `worldZ <= 0` during flight
2. **Extreme angles**: If target directly below, limit max downward velocity
3. **Spread shot compatibility**: Apply 3D calculation to all bullet angles
4. **Moving targets**: Lead calculation works same as current (2D movement prediction)

## Visual Feedback
- **Phase 1**: Keep current yellow circle bullets (simple)
- **Future**: Consider adding trail effect or ground shadow if needed

## Balance Considerations
- **Advantage**: Shoot over obstacles, hit from above
- **Trade-off**: Player exposed while airborne
- **Tuning**: May need lighter bullet gravity than player gravity

## Testing Plan
1. Jump and shoot stationary enemies - verify hits connect
2. Jump and shoot moving enemies - verify lead calculation
3. Test spread_shot buff - verify all bullets arc
4. Test ground collision - verify bullets destroy at floor
5. Test with different enemy types (regular, tentacles, props)

## Files Modified
- `src/entities/Bullet.js` - Add gravity support
- `src/entities/Player.js` - 3D targeting in shoot()
- `src/config.js` - Optional BULLET_GRAVITY constant
