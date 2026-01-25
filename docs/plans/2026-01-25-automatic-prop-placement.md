# Automatic Prop Placement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace drag-and-drop furniture system with automatic strategic prop placement in defensive ring patterns.

**Architecture:** Remove ~250 lines of drag-and-drop code from FortificationManager. Add ring-based position calculation system that spawns props in concentric defensive rings (outer → inner) triggered by supply drop event between waves.

**Tech Stack:** Phaser 3, JavaScript ES6 modules, isometric world coordinate system

---

## Task 1: Add Ring Configuration and Helper Method

**Files:**
- Modify: `src/systems/FortificationManager.js:12-26` (constructor)
- Modify: `src/systems/FortificationManager.js:31-68` (remove initializeSpawnPoints, add new methods)

**Step 1: Update constructor with ring configuration**

In `FortificationManager.js` constructor (lines 12-26), replace the `spawnPoints` initialization:

```javascript
constructor(scene) {
    this.scene = scene;
    this.fortificationProps = []; // All props

    // Ring-based placement system
    this.defensiveRings = [
        { radius: 12, waves: [1, 2, 3], propCount: 8 },      // Outer ring
        { radius: 8, waves: [4, 5, 6], propCount: 10 },      // Middle ring
        { radius: 5, waves: [7, 8, 9], propCount: 12 },      // Inner ring
        { radius: 3, waves: [10, 11, 12], propCount: 8 }     // Core ring
    ];

    this.saloonCenter = { worldX: 15, worldY: 12 }; // Center of world space

    // Initialize environmental systems
    this.physicsManager = new PhysicsManager(scene);
    this.fireSystem = new FireSystem(scene);
    this.destructionManager = new DestructionManager(scene);

    console.log('FortificationManager initialized with ring-based placement');
}
```

**Step 2: Remove old initializeSpawnPoints method**

Delete the entire `initializeSpawnPoints()` method (lines 31-68).

**Step 3: Add calculateRingPositions method**

Add this new method after where `initializeSpawnPoints()` was:

```javascript
/**
 * Calculate evenly-spaced positions around a defensive ring
 * @param {Object} ring - Ring configuration { radius, propCount }
 * @returns {Array} Array of { worldX, worldY } positions
 */
calculateRingPositions(ring) {
    const positions = [];
    const { radius, propCount } = ring;

    for (let i = 0; i < propCount; i++) {
        const angle = (i / propCount) * Math.PI * 2;
        const worldX = this.saloonCenter.worldX + radius * Math.cos(angle);
        const worldY = this.saloonCenter.worldY + radius * Math.sin(angle);

        positions.push({ worldX, worldY });
    }

    console.log(`Calculated ${positions.length} positions for ring (radius ${radius})`);
    return positions;
}
```

**Step 4: Test in browser**

Run: `npm start`
Navigate to game, open browser console
Expected: Console shows "FortificationManager initialized with ring-based placement"
Expected: No errors on game start

**Step 5: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "feat: add ring-based placement configuration

Replace spawn points with defensive ring system. Add
calculateRingPositions() to compute evenly-spaced positions around
concentric rings.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Position Collision Check

**Files:**
- Modify: `src/systems/FortificationManager.js` (add new method after calculateRingPositions)

**Step 1: Add isPositionOccupied method**

Add this method after `calculateRingPositions()`:

```javascript
/**
 * Check if a position is occupied by props, players, or outside bounds
 * @param {number} worldX - World X position
 * @param {number} worldY - World Y position
 * @param {number} checkRadius - Collision check radius in world units (default 1.5)
 * @returns {boolean} True if position is occupied/invalid
 */
isPositionOccupied(worldX, worldY, checkRadius = 1.5) {
    // Check existing props
    const hasPropNearby = this.fortificationProps.some(prop => {
        if (!prop.isAlive()) return false;

        const dx = prop.worldX - worldX;
        const dy = prop.worldY - worldY;
        return Math.sqrt(dx * dx + dy * dy) < checkRadius;
    });

    // Check players
    const hasPlayerNearby = this.scene.playerManager.players.some(player => {
        const dx = player.worldX - worldX;
        const dy = player.worldY - worldY;
        return Math.sqrt(dx * dx + dy * dy) < 2.0;
    });

    // Check world bounds
    const margin = 1.0;
    const inBounds = worldX >= WORLD_MIN_X + margin &&
                     worldX <= WORLD_MAX_X - margin &&
                     worldY >= WORLD_MIN_Y + margin &&
                     worldY <= WORLD_MAX_Y - margin;

    return hasPropNearby || hasPlayerNearby || !inBounds;
}
```

**Step 2: Test in browser**

Run: `npm start`
Open browser console, type in console:
```javascript
game.scene.scenes[2].fortificationManager.isPositionOccupied(15, 12)
```
Expected: Returns `true` or `false` based on whether center position is occupied
Expected: No errors

**Step 3: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "feat: add position collision checking

Add isPositionOccupied() to validate spawn positions against existing
props, players, and world bounds.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Supply Drop Methods

**Files:**
- Modify: `src/systems/FortificationManager.js` (add new methods after isPositionOccupied)

**Step 1: Add triggerSupplyDrop method**

Add after `isPositionOccupied()`:

```javascript
/**
 * Trigger supply drop event for a wave
 * @param {number} completedWaveNumber - Wave number just completed
 */
triggerSupplyDrop(completedWaveNumber) {
    const nextWave = completedWaveNumber + 1;

    console.log(`Supply drop triggered for wave ${nextWave}`);

    // Show notification
    if (this.scene.betweenWavesUI && this.scene.betweenWavesUI.showSupplyDropNotification) {
        this.scene.betweenWavesUI.showSupplyDropNotification();
    }

    // Wait 0.5 seconds, then spawn props
    this.scene.time.delayedCall(500, () => {
        this.spawnPropsForWave(nextWave);
    });
}
```

**Step 2: Add spawnPropsForWave method**

Add after `triggerSupplyDrop()`:

```javascript
/**
 * Spawn props at ring positions for a specific wave
 * @param {number} waveNumber - Wave number to spawn props for
 */
spawnPropsForWave(waveNumber) {
    console.log(`Spawning props for wave ${waveNumber}`);

    // Find which ring applies to this wave
    const ring = this.defensiveRings.find(r => r.waves.includes(waveNumber));

    if (!ring) {
        console.log(`No ring configuration for wave ${waveNumber}`);
        return;
    }

    // Calculate positions
    const positions = this.calculateRingPositions(ring);

    // Get prop types for this wave
    const propTypes = this.getItemsForWave(waveNumber);

    let spawnedCount = 0;

    // Spawn props at each position
    positions.forEach((pos, index) => {
        const propType = propTypes[index % propTypes.length];

        // Check collision before spawning
        if (!this.isPositionOccupied(pos.worldX, pos.worldY)) {
            this.spawnFortificationProp(propType, pos.worldX, pos.worldY, false);
            spawnedCount++;
        } else {
            console.log(`Position occupied at (${pos.worldX.toFixed(1)}, ${pos.worldY.toFixed(1)}), skipping spawn`);
        }
    });

    console.log(`Spawned ${spawnedCount}/${positions.length} props for wave ${waveNumber}`);
}
```

**Step 3: Test in browser**

Run: `npm start`
In browser console:
```javascript
game.scene.scenes[2].fortificationManager.spawnPropsForWave(1)
```
Expected: Console shows "Spawning props for wave 1" and spawn count
Expected: Props appear in a ring pattern on screen

**Step 4: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "feat: add supply drop spawn methods

Add triggerSupplyDrop() and spawnPropsForWave() to handle automatic
prop placement at calculated ring positions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Supply Drop Notification UI

**Files:**
- Modify: `src/ui/BetweenWavesUI.js` (add new method)

**Step 1: Add showSupplyDropNotification method**

Add this method after the `show()` method (around line 100):

```javascript
/**
 * Show "Furniture delivered!" notification
 */
showSupplyDropNotification() {
    const notificationText = this.scene.add.text(960, 150, 'Furniture delivered!', {
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    notificationText.setDepth(1000);

    // Fade out after 2 seconds
    this.scene.time.delayedCall(2000, () => {
        this.scene.tweens.add({
            targets: notificationText,
            alpha: 0,
            duration: 500,
            onComplete: () => notificationText.destroy()
        });
    });
}
```

**Step 2: Test in browser**

Run: `npm start`
In browser console:
```javascript
game.scene.scenes[2].betweenWavesUI.showSupplyDropNotification()
```
Expected: "Furniture delivered!" text appears at top-center
Expected: Text fades out after 2 seconds and disappears

**Step 3: Commit**

```bash
git add src/ui/BetweenWavesUI.js
git commit -m "feat: add supply drop notification UI

Add showSupplyDropNotification() to display 'Furniture delivered!'
message that fades out after 2 seconds.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update BetweenWavesUI Instructions

**Files:**
- Modify: `src/ui/BetweenWavesUI.js:45-58` (update instruction text)

**Step 1: Update instruction text in show() method**

In the `show()` method (lines 88-94), replace the instruction text update:

```javascript
// Update instructions with next wave number and items
if (this.instructionText) {
    this.instructionText.setText(
        `${itemsText}\n\n` +
        `Wave ${nextWave} incoming...\n\n` +
        `Press SPACE when ready`
    );
}
```

Remove the "Drag furniture to build barricades and set traps" line since dragging is no longer available.

**Step 2: Test in browser**

Run: `npm start`
Play until wave 1 completes
Expected: Between-wave UI shows updated text without drag instruction
Expected: No mention of dragging furniture

**Step 3: Commit**

```bash
git add src/ui/BetweenWavesUI.js
git commit -m "feat: update between-waves instructions

Remove drag-and-drop instruction from between-waves UI text.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Wire Supply Drop into GameScene

**Files:**
- Modify: `src/scenes/GameScene.js:1861-1886` (onEnterBetweenWaves method)

**Step 1: Update onEnterBetweenWaves method**

In `GameScene.js`, update the `onEnterBetweenWaves()` method (around lines 1861-1886):

```javascript
/**
 * Called when entering BETWEEN_WAVES state
 */
onEnterBetweenWaves() {
    console.log('Entering BETWEEN_WAVES state');

    const completedWave = this.waveManager ? this.waveManager.currentWave : 0;
    const nextWave = completedWave + 1;

    // Restore health to all surviving fortification props
    if (this.fortificationManager) {
        this.fortificationManager.restoreAllPropsHealth();
    }

    // Show UI overlay with wave numbers
    if (this.betweenWavesUI) {
        this.betweenWavesUI.show(completedWave, nextWave);
    }

    // Trigger supply drop for next wave (skip wave 1, already has initial furniture)
    if (this.fortificationManager && completedWave >= 1) {
        this.fortificationManager.triggerSupplyDrop(completedWave);
    }

    // Spawn health pickups at even waves
    if (completedWave > 0 && completedWave % 2 === 0) {
        const centerWorld = screenToWorld(960, 540, 0);
        const healthPickup = new this.HealthPickup(
            this,
            centerWorld.worldX,
            centerWorld.worldY
        );
        this.healthPickups.push(healthPickup);
        console.log(`Spawned health pickup at wave ${completedWave}`);
    }

    // Spawn cocktail powerups at waves divisible by 3
    if (completedWave > 0 && completedWave % 3 === 0) {
        const cocktailTypes = Object.keys(this.COCKTAIL_TYPES);
        const randomType = cocktailTypes[Math.floor(Math.random() * cocktailTypes.length)];

        const centerWorld = screenToWorld(960, 540, 0);
        const cocktail = new this.Cocktail(
            this,
            centerWorld.worldX + 2,
            centerWorld.worldY + 2,
            randomType
        );
        this.cocktails.push(cocktail);
        console.log(`Spawned ${randomType} cocktail at wave ${completedWave}`);
    }
}
```

Remove the `enablePropDragging()` call and the old `spawnItemsForWave()` call.

**Step 2: Remove onEnterWaveActive dragging disable call**

Find the `onEnterWaveActive()` method and remove the `disablePropDragging()` call:

Remove this line:
```javascript
this.fortificationManager.disablePropDragging();
```

**Step 3: Remove initialization dragging disable**

In `GameScene.js` around line 134, remove:
```javascript
this.fortificationManager.disablePropDragging();
```

Also remove the `initializeSpawnPoints()` call around line 131:
```javascript
this.fortificationManager.initializeSpawnPoints();
```

**Step 4: Test complete wave cycle**

Run: `npm start`
Play game through wave 1
Expected: Wave 1 completes → "Furniture delivered!" appears
Expected: After 0.5s, props spawn in outer ring pattern
Expected: Press SPACE → wave 2 starts
Expected: No errors in console

**Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: wire supply drop into game scene

Replace manual dragging calls with automatic supply drop trigger in
onEnterBetweenWaves(). Remove dragging enable/disable calls.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Remove Drag-and-Drop Code

**Files:**
- Modify: `src/systems/FortificationManager.js` (remove multiple methods)

**Step 1: Remove makeDraggable method**

Delete the entire `makeDraggable()` method (lines 301-326).

**Step 2: Remove drag event handlers**

Delete these entire methods:
- `onDragStart()` (lines 330-369)
- `onDrag()` (lines 373-456)
- `onDragEnd()` (lines 460-546)

**Step 3: Remove drag helper methods**

Delete these entire methods:
- `enablePropDragging()` (lines 656-663)
- `disablePropDragging()` (lines 669-677)
- `isValidPlacement()` (lines 604-633)

**Step 4: Remove addSpawnGlow method**

Delete the entire `addSpawnGlow()` method (lines 272-299) since new props no longer need glow effects.

**Step 5: Remove glow code from spawnFortificationProp**

In `spawnFortificationProp()` method, remove these lines:

```javascript
// Add visual glow for new spawns
if (isNewSpawn) {
    this.addSpawnGlow(prop);
}

// Enable drag-and-drop
this.makeDraggable(prop);
```

**Step 6: Remove getAvailableSpawnPoints method**

Delete the entire `getAvailableSpawnPoints()` method (lines 150-165).

**Step 7: Remove spawnItemsForWave method**

Delete the entire `spawnItemsForWave()` method (lines 118-144) - it's replaced by `spawnPropsForWave()`.

**Step 8: Remove drag-related properties from constructor**

In constructor, remove:
```javascript
this.draggedProp = null;
this.dragStartX = 0;
this.dragStartY = 0;
```

**Step 9: Test in browser**

Run: `npm start`
Play through multiple waves
Expected: No dragging functionality available
Expected: Props spawn automatically in rings
Expected: No console errors about missing methods

**Step 10: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "refactor: remove drag-and-drop system

Delete ~250 lines of drag-and-drop code including makeDraggable(),
drag event handlers, spawn glow effects, and related helper methods.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update Class Documentation

**Files:**
- Modify: `src/systems/FortificationManager.js:7-10` (class docstring)

**Step 1: Update class documentation**

Update the class docstring at the top of the file:

```javascript
/**
 * Manages fortification items: automatic strategic placement, persistence
 * Also manages environmental systems (fire, physics, destruction)
 */
```

Remove "drag-and-drop" from the description.

**Step 2: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "docs: update FortificationManager class description

Remove drag-and-drop reference from class documentation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Manual Testing & Verification

**Files:**
- None (testing only)

**Step 1: Test wave 1-3 (outer ring)**

Run: `npm start`
Play through waves 1, 2, 3
Expected: Props spawn in wide outer ring around edges
Expected: ~8 props per wave in outer positions
Verify: Props form defensive perimeter

**Step 2: Test wave 4-6 (middle ring)**

Continue playing to waves 4, 5, 6
Expected: Props spawn in tighter middle ring
Expected: ~10 props per wave closer to center
Verify: Second layer of defense visible

**Step 3: Test wave 7-9 (inner ring)**

Continue to waves 7, 8, 9
Expected: Props spawn in inner ring close to center
Expected: ~12 props per wave
Verify: Tight defensive formation

**Step 4: Test collision handling**

Play and observe prop spawning
Verify: Props don't spawn on top of players
Verify: Props don't spawn on top of existing props
Verify: Props stay within world bounds

**Step 5: Test prop persistence**

Damage some props during a wave
Complete the wave
Verify: Damaged props remain damaged
Verify: Destroyed props don't respawn
Verify: New wave props add to existing ones

**Step 6: Test UI flow**

Complete a wave
Verify: "Furniture delivered!" notification appears
Verify: Notification fades out after 2 seconds
Verify: Between-waves UI doesn't mention dragging
Verify: SPACE key starts next wave

**Step 7: Document any issues**

If bugs found, note them down for fixing.

---

## Task 10: Update Design Document Status

**Files:**
- Modify: `docs/plans/2026-01-25-automatic-prop-placement-design.md:4`

**Step 1: Update status in design doc**

Change line 4 from:
```markdown
**Status:** Design Complete - Ready for Implementation
```

To:
```markdown
**Status:** ✅ Implemented (2026-01-25)
```

**Step 2: Commit**

```bash
git add docs/plans/2026-01-25-automatic-prop-placement-design.md
git commit -m "docs: mark design as implemented

Update status to indicate implementation is complete.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Testing Checklist

After implementation, verify all these behaviors:

- [ ] Props spawn automatically at wave completion
- [ ] "Furniture delivered!" notification appears correctly
- [ ] Props form visible defensive rings around saloon center
- [ ] Ring radius decreases as waves progress (outer → middle → inner → core)
- [ ] Props don't spawn on top of players
- [ ] Props don't spawn on top of existing props
- [ ] Props remain within world bounds
- [ ] Initial furniture (bar, piano, etc.) still spawns before wave 1
- [ ] Props from previous waves persist correctly
- [ ] Damaged props stay damaged between waves
- [ ] Destroyed props don't respawn
- [ ] Collision and physics work correctly with new props
- [ ] SPACE key still starts next wave during between-waves phase
- [ ] No console errors about missing drag methods
- [ ] Game flows smoothly without interruption

## Notes

- Each task is designed to be completed in 2-5 minutes
- Commit after each task for easy rollback if needed
- Test in browser frequently to catch issues early
- Use browser console for quick method testing
- YAGNI: Don't add features beyond the design spec
- DRY: Reuse existing methods like `getItemsForWave()` and `spawnFortificationProp()`