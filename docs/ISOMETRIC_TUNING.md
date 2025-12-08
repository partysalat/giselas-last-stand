# Isometric Coordinate System Tuning Guide

## What to Test

### 1. Movement Feel
- **Test:** Walk around with WASD. Does it feel responsive?
- **Tune:** `ISOMETRIC_CONFIG.PLAYER_SPEED` in `src/config.js`
  - Too slow: Increase (try 10.0, 12.0)
  - Too fast: Decrease (try 6.0, 5.0)
  - Sweet spot: Around 8.0 (default)

### 2. Jumping Feel
- **Test:** Press SPACE to jump. Does it feel satisfying?
- **Tune:** `ISOMETRIC_CONFIG.JUMP_VELOCITY` and `ISOMETRIC_CONFIG.GRAVITY`
  - Jump too low: Increase JUMP_VELOCITY (more positive, like 600)
  - Jump too floaty: Increase GRAVITY (more negative, like -1500)
  - Jump too fast: Decrease GRAVITY (less negative, like -800)

### 3. Jumping Over Obstacles
- **Test:** Try jumping over barrels and chairs
- **Tune:** Obstacle `volumeHeight` in prop configs
  - Can't jump over barrels: Reduce barrel.volumeHeight (try 0.6)
  - Too easy to jump over chairs: Increase chair.volumeHeight (try 0.9)

### 4. Bullet Speed
- **Test:** Shoot enemies. Do bullets feel right?
- **Tune:** `ISOMETRIC_CONFIG.BULLET_SPEED`
  - Too slow: Increase (try 25.0)
  - Too fast to see: Decrease (try 15.0)

### 5. Enemy Speed
- **Test:** Do enemies chase at reasonable speed?
- **Tune:** `ISOMETRIC_CONFIG.ENEMY_SPEED_MULTIPLIER`
  - Enemies too fast: Decrease (try 0.6)
  - Enemies too slow: Increase (try 1.0)

## Debug Mode

Press **I** to toggle isometric debug visualization:
- Shows collision boxes vs sprite positions
- Green circle = collision position (world coords)
- Red circle = sprite render position
- Yellow line = mismatch between positions

## Common Issues

### "Movement feels diagonal"
- This is normal! Isometric space feels different from screen space
- Try adjusting camera angle or adding subtle screen-space bias

### "Can't tell where player is"
- Add shadow sprite at ground level (worldZ = 0) - already implemented!
- Increase player sprite scale slightly

### "Bullets miss enemies"
- Check enemy `height` property matches their sprite
- Verify bullet spawns at correct Z height

### "Depth sorting looks wrong"
- Entities further down screen (higher worldY) should render on top
- Check that all entities use `calculateDepth(worldY)` every frame
- Dynamic depth sorting is now implemented and runs every frame

## Recommended Starting Values

After extensive testing:
- `PLAYER_SPEED`: 8.0
- `JUMP_VELOCITY`: 500
- `GRAVITY`: -1200
- `BULLET_SPEED`: 20.0
- `ENEMY_SPEED_MULTIPLIER`: 0.8

Adjust from these baselines based on your gameplay feel preferences.
