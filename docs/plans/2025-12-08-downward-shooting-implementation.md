# Downward Shooting While Jumping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable players to shoot downward at ground-level enemies while jumping with bullets following a 3D trajectory affected by gravity.

**Architecture:** Extend Bullet class to support vertical velocity and gravity. Modify Player.shoot() to calculate 3D targeting when airborne. Bullets maintain straight-line trajectory when player is grounded, but arc downward with gravity when shot from the air.

**Tech Stack:** Phaser 3, ES6 modules, isometric coordinate system with world-space physics

---

## Task 1: Add Gravity Support to Bullet Class

**Files:**
- Modify: `src/entities/Bullet.js:4-42` (constructor and properties)
- Modify: `src/entities/Bullet.js:44-68` (update method)

### Step 1: Add gravity flag and update constructor signature

In `src/entities/Bullet.js`, modify the constructor to accept initial vertical velocity:

```javascript
constructor(scene, worldX, worldY, worldZ, angle, damage = 10, velocityZ = 0, hasGravity = false) {
    this.scene = scene;

    // World space coordinates
    this.worldX = worldX;
    this.worldY = worldY;
    this.worldZ = worldZ;

    // World space velocity
    const speed = ISOMETRIC_CONFIG.BULLET_SPEED;
    this.velocityX = Math.cos(angle) * speed;
    this.velocityY = Math.sin(angle) * speed;
    this.velocityZ = velocityZ; // Now accepts initial Z velocity

    // Gravity flag
    this.hasGravity = hasGravity;

    // Convert to screen space for sprite
    const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ);

    // Use a small circle for bullet visual
    this.sprite = scene.add.circle(screenX, screenY, 4, 0xFFFF00);
    this.sprite.setStrokeStyle(1, 0xFF8800, 1);

    // Bullet properties
    this.damage = damage;
    this.alive = true;
    this.piercing = false;
    this.radius = 0.1;

    this.sprite.setDepth(calculateDepth(this.worldY, 100));
}
```

**Expected:** Constructor now accepts velocityZ and hasGravity parameters.

### Step 2: Apply gravity in update method

In `src/entities/Bullet.js`, modify the `update()` method to apply gravity and handle ground collision:

```javascript
update(delta) {
    if (!delta || !this.alive) return;

    // Update world position
    const deltaSeconds = delta / 1000;

    // Apply gravity if enabled
    if (this.hasGravity) {
        this.velocityZ += ISOMETRIC_CONFIG.GRAVITY * deltaSeconds;
    }

    this.worldX += this.velocityX * deltaSeconds;
    this.worldY += this.velocityY * deltaSeconds;
    this.worldZ += this.velocityZ * deltaSeconds;

    // Destroy if hits ground
    if (this.worldZ <= 0) {
        this.destroy();
        return;
    }

    // Convert to screen space and update sprite
    const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);
    this.sprite.setPosition(screenX, screenY);

    // Update depth for proper isometric sorting
    this.sprite.setDepth(calculateDepth(this.worldY, 100));

    // Destroy if off screen (check screen bounds)
    const bounds = this.scene.cameras.main.worldView;
    if (screenX < bounds.x - 50 ||
        screenX > bounds.right + 50 ||
        screenY < bounds.y - 50 ||
        screenY > bounds.bottom + 50) {
        this.destroy();
    }
}
```

**Expected:** Bullets apply gravity when hasGravity=true and destroy when hitting ground (worldZ <= 0).

### Step 3: Test bullet gravity manually

Open the game in browser at `http://localhost:8000` and verify:
1. Existing bullets still work (no gravity, horizontal travel)
2. Game loads without errors
3. Shooting on ground still works as before

**Expected:** No errors in console, existing functionality unchanged.

### Step 4: Commit bullet gravity support

```bash
git add src/entities/Bullet.js
git commit -m "feat: add gravity support to bullets

- Add hasGravity flag and velocityZ parameter to constructor
- Apply ISOMETRIC_CONFIG.GRAVITY when hasGravity is true
- Destroy bullets when they hit ground (worldZ <= 0)
- Maintain backward compatibility with default parameters

Part of downward shooting implementation."
```

**Expected:** Clean commit with bullet gravity foundation.

---

## Task 2: Calculate Target Height Helper Function

**Files:**
- Modify: `src/entities/Player.js:220-341` (shoot method)

### Step 1: Add helper to calculate target center height

In `src/entities/Player.js`, add this helper method right before the `shoot()` method (around line 220):

```javascript
getTargetCenterHeight(targetEnemy) {
    if (targetEnemy.type === 'tentacle') {
        // Tentacles: estimate center height based on sprite position
        const enemy = targetEnemy.enemy;
        const tentSprite = enemy.tentacleSprites ? enemy.tentacleSprites[targetEnemy.tentacleIndex] : null;
        if (!tentSprite) return 0;
        // Tentacles are roughly 40 pixels tall, center is ~20 pixels
        return 0.4; // ~20 pixels in world units
    } else if (targetEnemy.type === 'enemy') {
        // Regular enemy: use worldZ + half height
        const enemy = targetEnemy.enemy;
        return enemy.worldZ + (enemy.height / 2);
    } else if (targetEnemy.type === 'prop') {
        // Props: use worldZ + half volume height
        const prop = targetEnemy.prop;
        return prop.worldZ + (prop.volumeHeight / 2);
    } else {
        // Legacy format: plain enemy object
        return targetEnemy.worldZ + (targetEnemy.height / 2);
    }
}
```

**Expected:** Helper method returns target's center height in world units.

### Step 2: Test with console log

Add a temporary console.log in the shoot method to verify the helper works:

```javascript
shoot(targetEnemy, currentTime) {
    if (!targetEnemy) {
        return;
    }

    // TEST: Log target height
    const targetHeight = this.getTargetCenterHeight(targetEnemy);
    console.log('Target height:', targetHeight);

    // ... rest of existing code
}
```

Open browser, shoot an enemy, check console for height values.

**Expected:** Console shows reasonable height values (0.4-1.0 range).

### Step 3: Remove test log and commit

Remove the console.log line, then commit:

```bash
git add src/entities/Player.js
git commit -m "feat: add helper to calculate target center height

- getTargetCenterHeight() calculates center point for different target types
- Handles enemies, tentacles, props, and legacy format
- Returns height in world units for 3D targeting

Part of downward shooting implementation."
```

**Expected:** Clean commit with target height calculation.

---

## Task 3: Implement 3D Trajectory Calculation

**Files:**
- Modify: `src/entities/Player.js:220-341` (shoot method)

### Step 1: Add 3D velocity calculation when airborne

In `src/entities/Player.js`, modify the `shoot()` method. Find the section after damage calculation (around line 310) and before the bullet creation loop. Replace the bullet creation section:

```javascript
// Calculate angle to target based on type
let targetScreenX, targetScreenY;

if (targetEnemy.type === 'tentacle') {
    const enemy = targetEnemy.enemy;
    const tentSprite = enemy.tentacleSprites ? enemy.tentacleSprites[targetEnemy.tentacleIndex] : null;
    if (tentSprite) {
        targetScreenX = tentSprite.x;
        targetScreenY = tentSprite.y;
    } else {
        return;
    }
} else if (targetEnemy.type === 'enemy') {
    targetScreenX = targetEnemy.enemy.getSprite().x;
    targetScreenY = targetEnemy.enemy.getSprite().y;
} else if (targetEnemy.type === 'prop') {
    targetScreenX = targetEnemy.prop.x;
    targetScreenY = targetEnemy.prop.y;
} else {
    targetScreenX = targetEnemy.getSprite().x;
    targetScreenY = targetEnemy.getSprite().y;
}

// Convert target from screen space to world space (assuming ground level)
const targetWorld = screenToWorld(targetScreenX, targetScreenY, 0);

// Calculate shooting parameters based on player height
const isAirborne = this.worldZ > 0;
let baseAngle, bulletVelocityZ, bulletHasGravity;

if (isAirborne) {
    // 3D trajectory calculation
    const targetHeight = this.getTargetCenterHeight(targetEnemy);
    const playerShootHeight = this.worldZ + 20; // Chest height

    // Calculate 3D distances
    const dx = targetWorld.worldX - this.worldX;
    const dy = targetWorld.worldY - this.worldY;
    const dz = targetHeight - playerShootHeight;
    const distance2D = Math.sqrt(dx * dx + dy * dy);

    // Calculate 3D velocity components
    const horizontalSpeed = ISOMETRIC_CONFIG.BULLET_SPEED;
    const velocityX = (dx / distance2D) * horizontalSpeed;
    const velocityY = (dy / distance2D) * horizontalSpeed;
    bulletVelocityZ = (dz / distance2D) * horizontalSpeed;

    // Calculate angle for horizontal component (still needed for spread shot)
    baseAngle = Math.atan2(dy, dx);
    bulletHasGravity = true;
} else {
    // Ground level - existing 2D calculation
    baseAngle = Math.atan2(
        targetWorld.worldY - this.worldY,
        targetWorld.worldX - this.worldX
    );
    bulletVelocityZ = 0;
    bulletHasGravity = false;
}

// Calculate damage with buffs (existing code)
let damage = this.bulletDamage;
// ... existing buff damage calculations ...
```

**Expected:** Code calculates 3D trajectory when airborne, 2D when grounded.

### Step 2: Update bullet creation to pass new parameters

Find the bullet creation loop (around line 324) and modify it:

```javascript
// Create bullets at player's world position with chest height
bulletAngles.forEach(angle => {
    const bullet = new this.scene.Bullet(
        this.scene,
        this.worldX,
        this.worldY,
        this.worldZ + 20, // Spawn at chest height
        angle,
        damage,
        bulletVelocityZ,  // NEW: Pass Z velocity
        bulletHasGravity  // NEW: Pass gravity flag
    );

    // Mark piercing bullets
    if (activeBuff === 'piercing') {
        bullet.piercing = true;
    }

    this.bullets.push(bullet);
});
```

**Expected:** Bullets created with vertical velocity and gravity when player is airborne.

### Step 3: Test airborne shooting

Run `npm start` if not already running, open browser:
1. Jump (SPACE bar)
2. While in air, shoot at an enemy
3. Observe bullet arcing downward

**Expected:** Bullets arc down from jump height toward enemies. Bullets on ground still shoot horizontally.

### Step 4: Commit 3D trajectory implementation

```bash
git add src/entities/Player.js
git commit -m "feat: implement 3D bullet trajectory for airborne shooting

- Calculate 3D velocity when player is airborne (worldZ > 0)
- Aim at target's center height using getTargetCenterHeight()
- Enable bullet gravity for airborne shots
- Maintain 2D horizontal trajectory when grounded
- Works with existing buff system (spread shot, damage, etc)

Part of downward shooting implementation."
```

**Expected:** Core downward shooting functionality complete.

---

## Task 4: Handle Spread Shot Buff with 3D Trajectories

**Files:**
- Modify: `src/entities/Player.js:310-341` (bullet angle calculation)

### Step 1: Adjust spread shot to work with 3D

In `src/entities/Player.js`, find the spread shot section (after damage calculation) and update it:

```javascript
// Determine number of bullets and angles based on buff
const bulletAngles = [];

if (activeBuff === 'spread_shot') {
    // 5 bullets in fan pattern
    for (let i = -2; i <= 2; i++) {
        bulletAngles.push(baseAngle + (i * Math.PI / 12));
    }
} else {
    // Single bullet
    bulletAngles.push(baseAngle);
}
```

**Note:** This code should already work since we calculate baseAngle for both 2D and 3D cases. The spread applies the fan pattern to the horizontal angle while maintaining the same vertical velocity for all bullets.

### Step 2: Test spread shot while jumping

In browser:
1. Find or spawn a Mojito cocktail (spread_shot buff)
2. Pick it up to activate spread shot
3. Jump and shoot at enemies

**Expected:** All 5 bullets arc downward in a fan pattern when airborne.

### Step 3: Verify edge cases

Test these scenarios:
1. Spread shot while grounded - should work as before (horizontal fan)
2. Spread shot while jumping - should create downward-arcing fan
3. Jump, shoot, land, shoot again - should switch between modes correctly

**Expected:** Spread shot works correctly in both airborne and grounded states.

### Step 4: Commit if any changes needed

If no changes needed (likely):
```bash
# No commit needed - spread shot already compatible
```

If adjustments were made:
```bash
git add src/entities/Player.js
git commit -m "fix: ensure spread shot works with 3D trajectories

Part of downward shooting implementation."
```

**Expected:** Spread shot confirmed working with 3D trajectories.

---

## Task 5: Tune Bullet Gravity (Optional)

**Files:**
- Modify: `src/config.js:73-105` (if needed)
- Modify: `src/entities/Bullet.js:44-68` (if BULLET_GRAVITY added)

### Step 1: Playtest gravity feel

Test the following scenarios:
1. Jump at max height and shoot - does bullet reach enemy?
2. Shoot while ascending vs descending - feel consistent?
3. Do bullets arc too much or too little?

**Decision Point:** If gravity feels too strong (bullets drop too fast), proceed to Step 2. Otherwise skip to Task 6.

### Step 2: Add BULLET_GRAVITY constant (if needed)

If player gravity is too strong for bullets, add to `src/config.js` in ISOMETRIC_CONFIG:

```javascript
export const ISOMETRIC_CONFIG = {
    // ... existing config ...

    // Height configuration
    GRAVITY: -1200,            // Player gravity
    BULLET_GRAVITY: -600,      // Bullet gravity (lighter than player)
    JUMP_VELOCITY: 500,
    MAX_JUMP_HEIGHT: 100,

    // ... rest of config ...
};
```

**Expected:** New constant available for bullet-specific gravity.

### Step 3: Use BULLET_GRAVITY in Bullet class (if added)

In `src/entities/Bullet.js`, modify the gravity application:

```javascript
// Apply gravity if enabled
if (this.hasGravity) {
    const gravity = ISOMETRIC_CONFIG.BULLET_GRAVITY || ISOMETRIC_CONFIG.GRAVITY;
    this.velocityZ += gravity * deltaSeconds;
}
```

**Expected:** Bullets use lighter gravity if BULLET_GRAVITY exists.

### Step 4: Playtest and tune

Adjust BULLET_GRAVITY value (try -400, -600, -800) until bullets feel good:
- Should arc noticeably but not dive-bomb
- Should reach targets at max jump height
- Should feel tactical, not random

**Expected:** Satisfying bullet arc that enhances gameplay.

### Step 5: Commit if changes made

If BULLET_GRAVITY was added:
```bash
git add src/config.js src/entities/Bullet.js
git commit -m "tune: add separate bullet gravity constant

- BULLET_GRAVITY = -600 (half of player gravity)
- Prevents bullets from dropping too fast while airborne
- Maintains tactical arc without dive-bombing

Part of downward shooting implementation."
```

**Expected:** Optional tuning committed if needed.

---

## Task 6: Manual Testing & Verification

**Files:**
- None (testing only)

### Step 1: Test basic airborne shooting

Test checklist:
- [ ] Jump and shoot at stationary enemy - bullet hits
- [ ] Jump and shoot at moving enemy - bullet tracks correctly
- [ ] Shoot while ascending - works
- [ ] Shoot while descending - works
- [ ] Shoot at peak of jump - works
- [ ] Land and shoot - returns to horizontal shooting

**Expected:** All scenarios work correctly.

### Step 2: Test with different enemy types

- [ ] Shoot lobster (ranged_shooter) while jumping
- [ ] Shoot shrimp (ranged_kiter) while jumping
- [ ] Shoot hermit crab (tank) while jumping
- [ ] Shoot boss enemies while jumping

**Expected:** Bullets hit all enemy types correctly.

### Step 3: Test with buffs

- [ ] Rapid fire buff + airborne shooting
- [ ] Heavy hitter buff + airborne shooting
- [ ] Spread shot buff + airborne shooting (5 arcing bullets)
- [ ] Piercing buff + airborne shooting
- [ ] Critical buff + airborne shooting
- [ ] Damage ramp buff + airborne shooting

**Expected:** All buffs work with airborne shooting.

### Step 4: Test edge cases

- [ ] Shoot straight down (enemy directly below)
- [ ] Shoot at very close range while jumping
- [ ] Shoot at maximum range while jumping
- [ ] Rapid jumping and shooting (spam jump + shoot)
- [ ] Jump over obstacles and shoot
- [ ] Multiple players jumping and shooting (if multiplayer active)

**Expected:** No crashes, bullets behave reasonably in all cases.

### Step 5: Document any issues found

If issues found, create a list:
```
Issues to address:
1. [Description of issue]
2. [Description of issue]
```

**Expected:** List of any remaining bugs or tuning needs.

---

## Task 7: Final Commit and Summary

**Files:**
- All modified files

### Step 1: Run final verification

```bash
npm start
```

Open browser, play for 2-3 minutes:
- Jump and shoot regularly
- Try different buffs
- Test edge cases

**Expected:** Feature works smoothly in normal gameplay.

### Step 2: Check git status

```bash
git status
```

**Expected:** All changes committed, working tree clean.

### Step 3: Create summary of changes

Document what was implemented:
- Bullet gravity system with hasGravity flag
- 3D trajectory calculation when player is airborne
- Target center height calculation for accurate aiming
- Ground collision for bullets (destroy when worldZ <= 0)
- Optional BULLET_GRAVITY constant for tuning
- Full compatibility with existing buff system

**Expected:** Clear understanding of implementation.

### Step 4: Ready for testing

Feature is complete and ready for:
- Extended playtesting
- Balance feedback
- Visual polish (trails, shadows) if needed
- Integration with main branch

**Expected:** Feature ready for merge consideration.

---

## Post-Implementation Notes

### Testing Recommendations
- Playtest for at least 10 minutes focusing on jump-shooting
- Try different player skill levels (beginner vs expert)
- Test in multiplayer if available
- Gather feedback on bullet arc feel

### Future Enhancements (Out of Scope)
- Bullet trail effects for better visibility
- Ground shadow for bullets to show landing point
- Different arc curves (e.g., higher arc for style)
- Jump-shooting damage bonus
- Aerial combo system

### Known Limitations
- Bullets always arc with gravity when airborne (no toggle)
- Same gravity for all bullet types
- No predictive targeting for moving enemies in 3D
- Spread shot uses same vertical velocity for all bullets

### Performance Considerations
- Gravity calculation is lightweight (one multiply per frame)
- No new sprites or particles added
- Minimal overhead on existing shooting system
