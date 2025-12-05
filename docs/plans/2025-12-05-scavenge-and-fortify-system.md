# Scavenge & Fortify System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement between-waves preparation system where players can drag-and-drop furniture to build defensive fortifications

**Architecture:** Extend existing game state machine with BETWEEN_WAVES state, create FortificationManager to handle drag-and-drop, integrate with existing EnvironmentProp and WaveManager systems

**Tech Stack:** Phaser 3, JavaScript ES6 modules, existing arcade physics system

---

## Phase 1: Foundation - Game State & UI

### Task 1: Add BETWEEN_WAVES Game State

**Files:**
- Modify: `src/scenes/GameScene.js`

**Step 1: Add game state constants**

At the top of GameScene.js after imports, add:

```javascript
// Game states
const GAME_STATE = {
    BETWEEN_WAVES: 'between_waves',
    WAVE_ACTIVE: 'wave_active',
    GAME_OVER: 'game_over'
};
```

**Step 2: Initialize game state in create()**

In the `create()` method, after line 30 where `this.isGameOver = false;` is set, add:

```javascript
// Initialize game state
this.gameState = GAME_STATE.WAVE_ACTIVE;
```

**Step 3: Add method to transition game states**

Add new method at the end of GameScene class (before the closing brace):

```javascript
/**
 * Transition to a new game state
 * @param {string} newState - The new game state from GAME_STATE enum
 */
setGameState(newState) {
    const oldState = this.gameState;
    this.gameState = newState;
    console.log(`Game state transition: ${oldState} -> ${newState}`);

    // Trigger state-specific logic
    if (newState === GAME_STATE.BETWEEN_WAVES) {
        this.onEnterBetweenWaves();
    } else if (newState === GAME_STATE.WAVE_ACTIVE) {
        this.onEnterWaveActive();
    }
}

/**
 * Called when entering BETWEEN_WAVES state
 */
onEnterBetweenWaves() {
    console.log('Entering BETWEEN_WAVES state');
    // Placeholder - will be implemented in Task 2
}

/**
 * Called when entering WAVE_ACTIVE state
 */
onEnterWaveActive() {
    console.log('Entering WAVE_ACTIVE state');
    // Placeholder - will be implemented in Task 2
}
```

**Step 4: Test in browser**

Run: `npm start` and open `http://localhost:8000`
Expected: Game loads without errors, check console for game state logs

**Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "$(cat <<'EOF'
feat: add BETWEEN_WAVES game state foundation

Add game state machine with BETWEEN_WAVES and WAVE_ACTIVE states.
Implements state transition methods as foundation for fortification system.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Create Between-Waves UI Overlay

**Files:**
- Create: `src/ui/BetweenWavesUI.js`

**Step 1: Create BetweenWavesUI class**

```javascript
/**
 * UI overlay displayed during between-waves fortification phase
 */
export class BetweenWavesUI {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.instructionText = null;
        this.readyButton = null;
        this.visible = false;
    }

    /**
     * Create UI elements
     */
    create() {
        // Create container for all UI elements
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(100); // High depth to appear above everything

        // Semi-transparent background overlay
        const overlay = this.scene.add.rectangle(
            960, 540,
            1920, 1080,
            0x000000,
            0.3
        );
        this.container.add(overlay);

        // Title text
        const titleText = this.scene.add.text(
            960, 200,
            'FORTIFY YOUR DEFENSES',
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        titleText.setOrigin(0.5);
        this.container.add(titleText);

        // Instruction text
        this.instructionText = this.scene.add.text(
            960, 300,
            'Drag furniture to build barricades and set traps\n\nPress SPACE when ready to start the next wave',
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        this.instructionText.setOrigin(0.5);
        this.container.add(this.instructionText);

        // Hide initially
        this.container.setVisible(false);
        this.visible = false;
    }

    /**
     * Show the UI overlay
     */
    show() {
        if (this.container) {
            this.container.setVisible(true);
            this.visible = true;
        }
    }

    /**
     * Hide the UI overlay
     */
    hide() {
        if (this.container) {
            this.container.setVisible(false);
            this.visible = false;
        }
    }

    /**
     * Check if UI is visible
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Cleanup UI elements
     */
    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}
```

**Step 2: Import and integrate into GameScene**

In `src/scenes/GameScene.js`, add import at top:

```javascript
import { BetweenWavesUI } from '../ui/BetweenWavesUI.js';
```

**Step 3: Create BetweenWavesUI instance in GameScene.create()**

After the boss announcer initialization (around line 110), add:

```javascript
// Initialize between-waves UI
this.betweenWavesUI = new BetweenWavesUI(this);
this.betweenWavesUI.create();
```

**Step 4: Implement onEnterBetweenWaves() in GameScene**

Update the placeholder method created in Task 1:

```javascript
onEnterBetweenWaves() {
    console.log('Entering BETWEEN_WAVES state');

    // Show UI overlay
    if (this.betweenWavesUI) {
        this.betweenWavesUI.show();
    }

    // Pause enemy spawning
    if (this.waveManager) {
        this.waveManager.isSpawning = false;
    }
}
```

**Step 5: Implement onEnterWaveActive() in GameScene**

Update the placeholder method:

```javascript
onEnterWaveActive() {
    console.log('Entering WAVE_ACTIVE state');

    // Hide UI overlay
    if (this.betweenWavesUI) {
        this.betweenWavesUI.hide();
    }
}
```

**Step 6: Add SPACE key handler in GameScene.update()**

In the `update()` method, add after the V key handler (around line 250):

```javascript
// SPACE key: Start next wave when in BETWEEN_WAVES state
if (this.gameState === GAME_STATE.BETWEEN_WAVES) {
    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        console.log('SPACE pressed - starting next wave');
        this.setGameState(GAME_STATE.WAVE_ACTIVE);

        // Start next wave
        if (this.waveManager) {
            this.waveManager.startNextWave();
        }
    }
}
```

**Step 7: Test in browser**

Run: `npm start` and open `http://localhost:8000`
Expected:
- Game loads without errors
- Console shows "Entering WAVE_ACTIVE state" on game start
- No UI overlay visible yet (will trigger in next task)

**Step 8: Commit**

```bash
git add src/ui/BetweenWavesUI.js src/scenes/GameScene.js
git commit -m "$(cat <<'EOF'
feat: add between-waves UI overlay

Create BetweenWavesUI component with fortification instructions.
Integrate with GameScene state machine, add SPACE key to start waves.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Trigger BETWEEN_WAVES State After Wave Completion

**Files:**
- Modify: `src/systems/WaveManager.js`
- Modify: `src/scenes/GameScene.js`

**Step 1: Add callback for wave completion in GameScene**

In `src/scenes/GameScene.js`, add new method after `onEnterWaveActive()`:

```javascript
/**
 * Called when a wave is completed
 */
onWaveComplete() {
    console.log('Wave completed - entering BETWEEN_WAVES state');

    // Transition to BETWEEN_WAVES state
    this.setGameState(GAME_STATE.BETWEEN_WAVES);
}
```

**Step 2: Find wave completion logic in WaveManager**

Read `src/systems/WaveManager.js` to find where waves are marked as complete. Look for patterns like:
- `this.waveActive = false`
- `this.enemiesRemaining === 0`
- Wave completion checks in update() method

**Step 3: Add scene callback to WaveManager.update()**

In `src/systems/WaveManager.js`, find the wave completion check (likely in the `update()` method around where `this.waveActive = false` is set).

Add callback after wave completion:

```javascript
// Existing code sets waveActive to false
this.waveActive = false;

// NEW: Notify scene of wave completion
if (this.scene.onWaveComplete) {
    this.scene.onWaveComplete();
}
```

**Step 4: Test wave completion**

Run: `npm start` and complete wave 1 by defeating all enemies
Expected:
- Console shows "Wave completed - entering BETWEEN_WAVES state"
- Between-waves UI overlay appears
- Instruction text visible: "Press SPACE when ready"

**Step 5: Test wave start**

While in BETWEEN_WAVES state, press SPACE
Expected:
- Console shows "SPACE pressed - starting next wave"
- UI overlay disappears
- Wave 2 starts spawning enemies

**Step 6: Commit**

```bash
git add src/systems/WaveManager.js src/scenes/GameScene.js
git commit -m "$(cat <<'EOF'
feat: trigger between-waves state after wave completion

Connect WaveManager to GameScene state machine. Automatically
enter BETWEEN_WAVES state when all enemies defeated.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Fortification Manager & Spawn System

### Task 4: Create FortificationManager

**Files:**
- Create: `src/systems/FortificationManager.js`

**Step 1: Create FortificationManager class skeleton**

```javascript
import { EnvironmentProp, PROP_TYPES } from '../entities/EnvironmentProp.js';

/**
 * Manages fortification items: spawning, drag-and-drop, persistence
 */
export class FortificationManager {
    constructor(scene) {
        this.scene = scene;
        this.fortificationProps = []; // All props that can be moved
        this.draggedProp = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.spawnPoints = [];

        console.log('FortificationManager initialized');
    }

    /**
     * Initialize spawn points around saloon perimeter
     */
    initializeSpawnPoints() {
        // Define 6 fixed spawn points around the edges
        this.spawnPoints = [
            { x: 300, y: 300, active: true },   // Top-left
            { x: 960, y: 200, active: true },   // Top-center
            { x: 1620, y: 300, active: true },  // Top-right
            { x: 1620, y: 780, active: true },  // Bottom-right
            { x: 960, y: 880, active: true },   // Bottom-center
            { x: 300, y: 780, active: true }    // Bottom-left
        ];

        console.log('Spawn points initialized:', this.spawnPoints.length);
    }

    /**
     * Spawn new items at spawn points based on wave number
     * @param {number} waveNumber - Current wave number
     */
    spawnItemsForWave(waveNumber) {
        console.log(`Spawning items for wave ${waveNumber}`);

        // Determine items to spawn based on wave number
        const itemsToSpawn = this.getItemsForWave(waveNumber);

        // Spawn items at available spawn points
        let spawnIndex = 0;
        itemsToSpawn.forEach(itemType => {
            if (spawnIndex >= this.spawnPoints.length) {
                console.warn('Not enough spawn points for all items');
                return;
            }

            const spawnPoint = this.spawnPoints[spawnIndex];
            this.spawnFortificationProp(itemType, spawnPoint.x, spawnPoint.y, true);
            spawnIndex++;
        });
    }

    /**
     * Determine which items to spawn for a given wave
     * @param {number} waveNumber - Current wave number
     * @returns {Array<string>} Array of prop type keys
     */
    getItemsForWave(waveNumber) {
        // Wave 1-2: Basic furniture only
        if (waveNumber <= 2) {
            return ['woodenChair', 'cardTable', 'barrel'];
        }

        // Wave 3-4: Add traps
        if (waveNumber <= 4) {
            return ['woodenChair', 'cardTable', 'barrel', 'explosiveBarrel'];
        }

        // Wave 5+: Full variety
        return ['woodenChair', 'cardTable', 'barrel', 'explosiveBarrel', 'oilLamp'];
    }

    /**
     * Spawn a fortification prop at a specific location
     * @param {string} propType - Prop type key from PROP_TYPES
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {boolean} isNewSpawn - Whether this is a newly spawned item (shows glow)
     */
    spawnFortificationProp(propType, x, y, isNewSpawn = false) {
        const prop = new EnvironmentProp(this.scene, x, y, propType);

        // Mark as fortification prop
        prop.isFortification = true;
        prop.isNewSpawn = isNewSpawn;

        // Add visual glow for new spawns
        if (isNewSpawn) {
            this.addSpawnGlow(prop);
        }

        // Enable drag-and-drop
        this.makeDraggable(prop);

        // Track in fortifications array
        this.fortificationProps.push(prop);

        console.log(`Spawned fortification prop: ${propType} at (${x}, ${y})`);

        return prop;
    }

    /**
     * Add visual glow effect to newly spawned items
     * @param {EnvironmentProp} prop - The prop to add glow to
     */
    addSpawnGlow(prop) {
        const sprite = prop.getSprite();
        if (!sprite) return;

        // Create glowing outline
        const glow = this.scene.add.circle(
            sprite.x,
            sprite.y,
            Math.max(prop.width, prop.height) / 2 + 10,
            0xFFD700,
            0
        );
        glow.setStrokeStyle(3, 0xFFD700, 0.8);
        glow.setDepth(sprite.depth - 1);

        // Pulsing animation
        this.scene.tweens.add({
            targets: glow,
            alpha: { from: 0.8, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Store reference for cleanup
        prop.spawnGlow = glow;
    }

    /**
     * Make a prop draggable with mouse
     * @param {EnvironmentProp} prop - The prop to make draggable
     */
    makeDraggable(prop) {
        const sprite = prop.getSprite();
        if (!sprite) return;

        // Enable input on sprite
        sprite.setInteractive({ draggable: true });

        // Drag start
        sprite.on('dragstart', (pointer, dragX, dragY) => {
            this.onDragStart(prop, pointer, dragX, dragY);
        });

        // Drag
        sprite.on('drag', (pointer, dragX, dragY) => {
            this.onDrag(prop, pointer, dragX, dragY);
        });

        // Drag end
        sprite.on('dragend', (pointer, dragX, dragY) => {
            this.onDragEnd(prop, pointer, dragX, dragY);
        });
    }

    /**
     * Handle drag start
     */
    onDragStart(prop, pointer, dragX, dragY) {
        console.log(`Drag start: ${prop.name}`);
        this.draggedProp = prop;
        this.dragStartX = prop.x;
        this.dragStartY = prop.y;

        const sprite = prop.getSprite();
        if (sprite) {
            sprite.setAlpha(0.7);
            sprite.setDepth(200); // Bring to front while dragging
        }

        // Remove spawn glow if present
        if (prop.spawnGlow) {
            this.scene.tweens.killTweensOf(prop.spawnGlow);
            prop.spawnGlow.destroy();
            prop.spawnGlow = null;
            prop.isNewSpawn = false;
        }
    }

    /**
     * Handle drag movement
     */
    onDrag(prop, pointer, dragX, dragY) {
        const sprite = prop.getSprite();
        if (!sprite) return;

        // Update sprite position
        sprite.x = pointer.x;
        sprite.y = pointer.y;

        // Update prop position
        prop.x = pointer.x;
        prop.y = pointer.y;

        // Update physics body if exists
        if (sprite.body) {
            sprite.body.x = pointer.x - sprite.body.width / 2;
            sprite.body.y = pointer.y - sprite.body.height / 2;
        }

        // Update health bar position if exists
        if (prop.healthBarBg && prop.healthBarFill) {
            prop.healthBarBg.x = pointer.x;
            prop.healthBarBg.y = pointer.y - prop.height / 2 - 10;

            const healthPercent = prop.getHealthPercent();
            prop.healthBarFill.x = pointer.x - prop.width / 2 + (prop.width * healthPercent) / 2;
            prop.healthBarFill.y = pointer.y - prop.height / 2 - 10;
        }
    }

    /**
     * Handle drag end
     */
    onDragEnd(prop, pointer, dragX, dragY) {
        console.log(`Drag end: ${prop.name} at (${pointer.x}, ${pointer.y})`);

        const sprite = prop.getSprite();
        if (sprite) {
            sprite.setAlpha(1.0);

            // Restore original depth based on Y position
            const baseDepthMap = {
                'floor': 2,
                'ground': 5,
                'wall': 4,
                'table': 6,
                'structure': 7,
                'ceiling': 35
            };
            const baseDepth = baseDepthMap[prop.layer] || 5;
            const spriteBottom = sprite.y + (sprite.displayHeight / 2);
            const depthOffset = spriteBottom / 10;
            sprite.setDepth(baseDepth + depthOffset);
        }

        this.draggedProp = null;
    }

    /**
     * Update fortification system
     */
    update(delta) {
        // Update all fortification props
        this.fortificationProps.forEach(prop => {
            if (prop.update) {
                prop.update(delta);
            }
        });

        // Remove destroyed props
        this.fortificationProps = this.fortificationProps.filter(prop => prop.isAlive());
    }

    /**
     * Clean up all fortifications
     */
    destroy() {
        this.fortificationProps.forEach(prop => {
            if (prop.spawnGlow) {
                prop.spawnGlow.destroy();
            }
            prop.destroy();
        });
        this.fortificationProps = [];
    }
}
```

**Step 2: Import and create FortificationManager in GameScene**

In `src/scenes/GameScene.js`, add import:

```javascript
import { FortificationManager } from '../systems/FortificationManager.js';
```

**Step 3: Initialize FortificationManager in GameScene.create()**

After `WaveManager` initialization (around line 93), add:

```javascript
// Initialize fortification manager
this.fortificationManager = new FortificationManager(this);
this.fortificationManager.initializeSpawnPoints();
```

**Step 4: Call spawnItemsForWave in onEnterBetweenWaves()**

Update `onEnterBetweenWaves()` in GameScene:

```javascript
onEnterBetweenWaves() {
    console.log('Entering BETWEEN_WAVES state');

    // Show UI overlay
    if (this.betweenWavesUI) {
        this.betweenWavesUI.show();
    }

    // Spawn fortification items
    if (this.fortificationManager) {
        const currentWave = this.waveManager ? this.waveManager.currentWave : 1;
        this.fortificationManager.spawnItemsForWave(currentWave);
    }

    // Pause enemy spawning
    if (this.waveManager) {
        this.waveManager.isSpawning = false;
    }
}
```

**Step 5: Update FortificationManager in GameScene.update()**

In GameScene's `update()` method, after existing manager updates, add:

```javascript
// Update fortification manager
if (this.fortificationManager) {
    this.fortificationManager.update(delta);
}
```

**Step 6: Test in browser**

Run: `npm start` and complete wave 1
Expected:
- Between-waves UI appears
- 3 items spawn at edges with golden glow (chair, table, barrel)
- Can click and drag items around the screen
- Items maintain visual appearance while dragging
- Glow disappears when first dragged

**Step 7: Test wave progression**

Press SPACE to start wave 2, complete it, check spawned items
Expected:
- Wave 2 completion spawns items again (possibly duplicates or new items)
- New items have golden glow
- Previously placed items remain where placed

**Step 8: Commit**

```bash
git add src/systems/FortificationManager.js src/scenes/GameScene.js
git commit -m "$(cat <<'EOF'
feat: add fortification manager with drag-and-drop

Implement FortificationManager to spawn and manage movable props.
Support mouse drag-and-drop for furniture rearrangement.
Add progressive item unlocks based on wave number.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Initial Saloon Furniture & Persistence

### Task 5: Spawn Initial Saloon Furniture

**Files:**
- Modify: `src/systems/FortificationManager.js`
- Modify: `src/scenes/GameScene.js`

**Step 1: Add method to spawn initial furniture**

In `src/systems/FortificationManager.js`, add new method after `initializeSpawnPoints()`:

```javascript
/**
 * Spawn initial saloon furniture in "normal" positions
 */
spawnInitialFurniture() {
    console.log('Spawning initial saloon furniture');

    // Bar counter (top-left area)
    this.spawnFortificationProp('barCounter', 300, 400, false);

    // Piano (top-right area)
    this.spawnFortificationProp('piano', 1620, 400, false);

    // Card tables (scattered around)
    this.spawnFortificationProp('cardTable', 700, 500, false);
    this.spawnFortificationProp('cardTable', 1220, 500, false);

    // Chairs around tables
    this.spawnFortificationProp('woodenChair', 650, 450, false);
    this.spawnFortificationProp('woodenChair', 750, 450, false);
    this.spawnFortificationProp('woodenChair', 1170, 450, false);
    this.spawnFortificationProp('woodenChair', 1270, 450, false);

    // Barrels in corners
    this.spawnFortificationProp('barrel', 200, 250, false);
    this.spawnFortificationProp('barrel', 1720, 250, false);

    // Bar stools at bar
    this.spawnFortificationProp('barStool', 250, 400, false);
    this.spawnFortificationProp('barStool', 350, 400, false);

    console.log(`Spawned ${this.fortificationProps.length} initial furniture pieces`);
}
```

**Step 2: Call spawnInitialFurniture in GameScene.create()**

In `src/scenes/GameScene.js`, after fortificationManager initialization:

```javascript
// Initialize fortification manager
this.fortificationManager = new FortificationManager(this);
this.fortificationManager.initializeSpawnPoints();
this.fortificationManager.spawnInitialFurniture();
```

**Step 3: Test in browser**

Run: `npm start`
Expected:
- Game starts with furniture already placed in saloon
- ~12 items visible: bar, piano, tables, chairs, barrels, stools
- All items draggable immediately
- No golden glow on initial furniture

**Step 4: Adjust positions if needed**

Play test and adjust furniture positions in `spawnInitialFurniture()` for better layout
- Ensure furniture doesn't block player spawn
- Create some open pathways
- Distribute furniture across the play area

**Step 5: Commit**

```bash
git add src/systems/FortificationManager.js src/scenes/GameScene.js
git commit -m "$(cat <<'EOF'
feat: spawn initial saloon furniture at game start

Add spawnInitialFurniture to place bar, tables, chairs in default
positions. All items draggable from start for fortification.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Prevent Duplicate Spawns at Same Location

**Files:**
- Modify: `src/systems/FortificationManager.js`

**Step 1: Add spawn point tracking**

In `FortificationManager.spawnItemsForWave()`, update to cycle through spawn points:

```javascript
spawnItemsForWave(waveNumber) {
    console.log(`Spawning items for wave ${waveNumber}`);

    // Determine items to spawn based on wave number
    const itemsToSpawn = this.getItemsForWave(waveNumber);

    // Find available spawn points (no props nearby)
    const availableSpawnPoints = this.getAvailableSpawnPoints();

    if (availableSpawnPoints.length === 0) {
        console.warn('No available spawn points - all occupied');
        return;
    }

    // Spawn items at available spawn points
    let spawnIndex = 0;
    itemsToSpawn.forEach(itemType => {
        if (spawnIndex >= availableSpawnPoints.length) {
            console.warn('Not enough spawn points for all items');
            return;
        }

        const spawnPoint = availableSpawnPoints[spawnIndex];
        this.spawnFortificationProp(itemType, spawnPoint.x, spawnPoint.y, true);
        spawnIndex++;
    });
}
```

**Step 2: Add method to find available spawn points**

Add new method in `FortificationManager`:

```javascript
/**
 * Get spawn points that don't have props nearby
 * @returns {Array} Available spawn points
 */
getAvailableSpawnPoints() {
    const minDistance = 80; // Minimum distance from existing props

    return this.spawnPoints.filter(spawnPoint => {
        // Check if any fortification prop is too close
        const hasPropNearby = this.fortificationProps.some(prop => {
            const dx = prop.x - spawnPoint.x;
            const dy = prop.y - spawnPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < minDistance;
        });

        return !hasPropNearby;
    });
}
```

**Step 3: Test in browser**

Run: `npm start`, complete wave 1 and 2
Expected:
- Wave 1 completion: Items spawn at edges
- Wave 2 completion: Items spawn at different edges (avoiding wave 1 items)
- No overlapping spawns

**Step 4: Test spawn point exhaustion**

Complete 5+ waves without moving items
Expected:
- Console warns "No available spawn points - all occupied"
- No new items spawn if all points occupied
- Game continues normally

**Step 5: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "$(cat <<'EOF'
feat: prevent duplicate spawns at occupied spawn points

Add spawn point availability checking to avoid overlapping items.
Cycle through available spawn points across waves.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Persist Fortifications Between Waves

**Files:**
- Modify: `src/systems/FortificationManager.js`

**Note:** Fortifications already persist by default since they're stored in `this.fortificationProps` array and not destroyed between waves. This task verifies persistence and ensures damage state carries over.

**Step 1: Verify fortification persistence**

Test: Complete wave 1, drag furniture to new positions, start wave 2
Expected:
- Furniture remains in new positions
- New spawned items appear, but old items unchanged

**Step 2: Verify damage persistence**

Test: Shoot a barrel during wave, reduce its health, complete wave
Expected:
- Barrel shows damage (health bar visible, reduced opacity)
- Damage persists into next wave
- Health bar remains visible

**Step 3: Add debug logging for persistence**

In `FortificationManager.update()`, add periodic logging:

```javascript
update(delta) {
    // Update all fortification props
    this.fortificationProps.forEach(prop => {
        if (prop.update) {
            prop.update(delta);
        }
    });

    // Remove destroyed props
    const beforeCount = this.fortificationProps.length;
    this.fortificationProps = this.fortificationProps.filter(prop => prop.isAlive());
    const afterCount = this.fortificationProps.length;

    if (beforeCount !== afterCount) {
        console.log(`Fortifications: ${beforeCount} -> ${afterCount} (${beforeCount - afterCount} destroyed)`);
    }
}
```

**Step 4: Test destruction and persistence**

Test: Destroy a chair during wave, complete wave, start next wave
Expected:
- Destroyed chair remains destroyed (not respawned)
- Console logs "Fortifications: X -> Y (1 destroyed)"

**Step 5: Document persistence behavior**

No code changes needed. Persistence is working as designed.

**Step 6: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "$(cat <<'EOF'
feat: verify and log fortification persistence

Add debug logging to track fortification lifecycle.
Confirm damage and destruction state persists between waves.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Combat Integration

### Task 8: Enable Enemy Pathfinding Around Fortifications

**Files:**
- Modify: `src/entities/Enemy.js`

**Step 1: Read current Enemy.js to understand movement**

Read `src/entities/Enemy.js` to find movement logic and understand how enemies currently move toward player.

**Step 2: Check if physics collisions already work**

Fortifications created by `EnvironmentProp` should already have physics bodies that block movement. Verify by testing:
- Start game
- Drag furniture into enemy path
- Enemies should collide with furniture

Expected: Enemies may get stuck on furniture (need pathfinding fix)

**Step 3: Add simple avoidance behavior**

If enemies get stuck, add basic obstacle avoidance in Enemy movement update. This is a simplified approach - full pathfinding would require A* algorithm (out of scope for Phase 1).

In Enemy movement code, add obstacle detection:

```javascript
// Pseudo-code for simple avoidance (adapt to actual Enemy.js structure)
// Before moving toward target:

// Check if obstacle directly ahead
const raycastDistance = 50;
const checkX = this.x + Math.cos(angleToTarget) * raycastDistance;
const checkY = this.y + Math.sin(angleToTarget) * raycastDistance;

// If obstacle detected at check position, try perpendicular angles
const hasObstacle = this.scene.fortificationManager.checkObstacleAt(checkX, checkY);
if (hasObstacle) {
    // Try moving at +90 or -90 degrees to go around
    angleToTarget += Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
}
```

**Step 4: Add collision checking helper**

In `FortificationManager`, add method:

```javascript
/**
 * Check if there's an obstacle at a position
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Check radius (default 30)
 * @returns {boolean} True if obstacle present
 */
checkObstacleAt(x, y, radius = 30) {
    return this.fortificationProps.some(prop => {
        if (!prop.isAlive()) return false;

        const dx = prop.x - x;
        const dy = prop.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < (radius + Math.max(prop.width, prop.height) / 2);
    });
}
```

**Step 5: Test pathfinding**

Run: `npm start`
- Drag furniture into enemy paths
- Enemies should attempt to go around obstacles
- Enemies may still get stuck but should make effort to avoid

**Step 6: Note for future improvement**

Add comment in code:

```javascript
// TODO: Implement proper A* pathfinding for smoother enemy navigation
// Current approach uses simple obstacle avoidance which may cause stuck enemies
```

**Step 7: Commit**

```bash
git add src/entities/Enemy.js src/systems/FortificationManager.js
git commit -m "$(cat <<'EOF'
feat: add basic enemy obstacle avoidance for fortifications

Implement simple avoidance behavior when enemies encounter furniture.
Uses perpendicular movement to navigate around obstacles.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Enable Enemies to Damage and Destroy Fortifications

**Files:**
- Modify: `src/entities/Enemy.js`

**Step 1: Add fortification attack logic to Enemy**

In `Enemy.js`, find where enemies attack the player. Add logic to also attack fortifications when close.

In Enemy update method, after player attack check:

```javascript
// Check for fortifications to attack
if (!this.target && this.scene.fortificationManager) {
    const nearbyFortification = this.findNearestFortification();
    if (nearbyFortification && this.distanceTo(nearbyFortification) < this.attackRange) {
        this.attackFortification(nearbyFortification);
    }
}
```

**Step 2: Add helper methods to Enemy**

```javascript
/**
 * Find nearest fortification prop
 * @returns {EnvironmentProp|null}
 */
findNearestFortification() {
    if (!this.scene.fortificationManager) return null;

    let nearestProp = null;
    let nearestDistance = Infinity;

    this.scene.fortificationManager.fortificationProps.forEach(prop => {
        if (!prop.isAlive()) return;

        const distance = this.distanceTo(prop);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestProp = prop;
        }
    });

    return nearestProp;
}

/**
 * Calculate distance to a fortification prop
 * @param {EnvironmentProp} prop
 * @returns {number}
 */
distanceTo(prop) {
    const dx = this.sprite.x - prop.x;
    const dy = this.sprite.y - prop.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Attack a fortification prop
 * @param {EnvironmentProp} prop
 */
attackFortification(prop) {
    if (!this.canAttack()) return;

    // Deal damage to fortification
    const damage = this.attackDamage || 10;
    prop.takeDamage(damage);

    console.log(`${this.name} attacked ${prop.name} for ${damage} damage`);

    // Set attack cooldown
    this.lastAttackTime = Date.now();
}
```

**Step 3: Test fortification destruction by enemies**

Run: `npm start`
- Let enemies reach furniture
- Enemies should attack and damage furniture
- Furniture health bars appear and decrease
- Furniture is eventually destroyed

**Step 4: Verify destruction particles**

When furniture destroyed:
Expected:
- Destruction particles appear
- Furniture sprite removed
- Special effects trigger (explosions for barrels, etc.)

**Step 5: Balance attack damage**

If furniture destroyed too quickly/slowly, adjust `attackDamage` in Enemy class or fortification health values in PROP_TYPES.

**Step 6: Commit**

```bash
git add src/entities/Enemy.js
git commit -m "$(cat <<'EOF'
feat: enable enemies to attack and destroy fortifications

Add fortification targeting to enemy AI. Enemies now attack
nearby furniture when not pursuing player, creating dynamic
defense degradation over waves.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Enable Player to Shoot Explosive Barrels

**Files:**
- Modify: `src/entities/Bullet.js` (or wherever bullet collision is handled)
- Modify: `src/systems/FortificationManager.js`

**Step 1: Add bullet collision check for fortifications**

In `GameScene.js` update method, find where bullet collisions are checked. After enemy collision checks, add:

```javascript
// Check bullet collisions with fortification props
if (this.fortificationManager) {
    this.fortificationManager.fortificationProps.forEach(prop => {
        if (!prop.isAlive()) return;
        if (!prop.blocksBullets) return;

        // Check collision with this bullet
        if (prop.checkBulletCollision(bullet.x, bullet.y)) {
            // Damage the prop
            prop.takeDamage(bullet.damage || 10);

            // Destroy bullet
            bullet.destroy();

            console.log(`Bullet hit ${prop.name}`);
        }
    });
}
```

**Step 2: Test player shooting furniture**

Run: `npm start`
- Shoot at wooden chair
- Expected: Chair takes damage, health bar appears

**Step 3: Test shooting explosive barrel**

- Shoot at explosive barrel multiple times
- Expected:
  - Barrel takes damage
  - When health reaches 0, explosion triggers
  - Explosion circle expands
  - Nearby entities take damage
  - Barrel destroyed with particles

**Step 4: Test explosion chain reactions**

- Place multiple explosive barrels near each other
- Shoot one barrel
- Expected:
  - First barrel explodes
  - Explosion damages nearby barrels
  - Chain reaction triggers
  - Multiple explosions in sequence

**Step 5: Verify explosion damage to enemies**

- Shoot explosive barrel near enemies
- Expected:
  - Enemies in explosion radius take damage
  - Enemies killed if damage exceeds health
  - Death particles/effects for enemies

**Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "$(cat <<'EOF'
feat: enable shooting fortifications and explosive barrels

Add bullet collision detection for fortification props.
Support shooting to damage furniture and trigger explosions.
Implement chain reaction for multiple nearby explosives.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: Polish & Refinement

### Task 11: Improve Drag-and-Drop Visual Feedback

**Files:**
- Modify: `src/systems/FortificationManager.js`

**Step 1: Add drag shadow/outline**

In `FortificationManager.onDragStart()`, add shadow effect:

```javascript
onDragStart(prop, pointer, dragX, dragY) {
    console.log(`Drag start: ${prop.name}`);
    this.draggedProp = prop;
    this.dragStartX = prop.x;
    this.dragStartY = prop.y;

    const sprite = prop.getSprite();
    if (sprite) {
        sprite.setAlpha(0.7);
        sprite.setDepth(200);

        // NEW: Add drag shadow
        this.dragShadow = this.scene.add.rectangle(
            prop.x,
            prop.y,
            prop.width,
            prop.height,
            0x000000,
            0.3
        );
        this.dragShadow.setDepth(199);
    }

    // Remove spawn glow if present
    if (prop.spawnGlow) {
        this.scene.tweens.killTweensOf(prop.spawnGlow);
        prop.spawnGlow.destroy();
        prop.spawnGlow = null;
        prop.isNewSpawn = false;
    }
}
```

**Step 2: Update shadow during drag**

In `FortificationManager.onDrag()`, update shadow position:

```javascript
onDrag(prop, pointer, dragX, dragY) {
    const sprite = prop.getSprite();
    if (!sprite) return;

    // Update sprite position
    sprite.x = pointer.x;
    sprite.y = pointer.y;

    // Update prop position
    prop.x = pointer.x;
    prop.y = pointer.y;

    // NEW: Update shadow position
    if (this.dragShadow) {
        this.dragShadow.x = pointer.x;
        this.dragShadow.y = pointer.y + 10; // Offset slightly below
    }

    // Update physics body if exists
    if (sprite.body) {
        sprite.body.x = pointer.x - sprite.body.width / 2;
        sprite.body.y = pointer.y - sprite.body.height / 2;
    }

    // Update health bar position if exists
    if (prop.healthBarBg && prop.healthBarFill) {
        prop.healthBarBg.x = pointer.x;
        prop.healthBarBg.y = pointer.y - prop.height / 2 - 10;

        const healthPercent = prop.getHealthPercent();
        prop.healthBarFill.x = pointer.x - prop.width / 2 + (prop.width * healthPercent) / 2;
        prop.healthBarFill.y = pointer.y - prop.height / 2 - 10;
    }
}
```

**Step 3: Remove shadow on drag end**

In `FortificationManager.onDragEnd()`, clean up shadow:

```javascript
onDragEnd(prop, pointer, dragX, dragY) {
    console.log(`Drag end: ${prop.name} at (${pointer.x}, ${pointer.y})`);

    const sprite = prop.getSprite();
    if (sprite) {
        sprite.setAlpha(1.0);

        // Restore original depth based on Y position
        const baseDepthMap = {
            'floor': 2,
            'ground': 5,
            'wall': 4,
            'table': 6,
            'structure': 7,
            'ceiling': 35
        };
        const baseDepth = baseDepthMap[prop.layer] || 5;
        const spriteBottom = sprite.y + (sprite.displayHeight / 2);
        const depthOffset = spriteBottom / 10;
        sprite.setDepth(baseDepth + depthOffset);
    }

    // NEW: Remove shadow
    if (this.dragShadow) {
        this.dragShadow.destroy();
        this.dragShadow = null;
    }

    this.draggedProp = null;
}
```

**Step 4: Add placement sound effect (optional)**

In `onDragEnd()`, add sound:

```javascript
// Play placement sound
this.scene.sound.play('thud', { volume: 0.3 });
```

Note: Requires 'thud' sound asset to be loaded in PreloadScene. Skip if no sound asset available.

**Step 5: Test improved drag feedback**

Run: `npm start`
- Drag furniture around
- Expected:
  - Shadow appears beneath dragged item
  - Item becomes semi-transparent while dragging
  - Shadow follows cursor smoothly
  - Shadow disappears on drop
  - (Optional) Thud sound on placement

**Step 6: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "$(cat <<'EOF'
feat: improve drag-and-drop visual feedback

Add shadow effect beneath dragged items for better depth perception.
Enhance transparency during drag for clearer placement preview.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Add Placement Validation (Prevent Invalid Positions)

**Files:**
- Modify: `src/systems/FortificationManager.js`

**Step 1: Add bounds checking**

In `FortificationManager.onDragEnd()`, validate placement:

```javascript
onDragEnd(prop, pointer, dragX, dragY) {
    console.log(`Drag end: ${prop.name} at (${pointer.x}, ${pointer.y})`);

    // Validate placement position
    const isValidPosition = this.isValidPlacement(pointer.x, pointer.y, prop);

    if (!isValidPosition) {
        console.log('Invalid placement - returning to start position');

        // Return to drag start position
        const sprite = prop.getSprite();
        if (sprite) {
            sprite.x = this.dragStartX;
            sprite.y = this.dragStartY;
        }
        prop.x = this.dragStartX;
        prop.y = this.dragStartY;

        // Update physics body
        if (sprite && sprite.body) {
            sprite.body.x = this.dragStartX - sprite.body.width / 2;
            sprite.body.y = this.dragStartY - sprite.body.height / 2;
        }

        // Play error sound (optional)
        // this.scene.sound.play('error', { volume: 0.3 });
    }

    const sprite = prop.getSprite();
    if (sprite) {
        sprite.setAlpha(1.0);

        // Restore original depth based on Y position
        const baseDepthMap = {
            'floor': 2,
            'ground': 5,
            'wall': 4,
            'table': 6,
            'structure': 7,
            'ceiling': 35
        };
        const baseDepth = baseDepthMap[prop.layer] || 5;
        const spriteBottom = sprite.y + (sprite.displayHeight / 2);
        const depthOffset = spriteBottom / 10;
        sprite.setDepth(baseDepth + depthOffset);
    }

    // Remove shadow
    if (this.dragShadow) {
        this.dragShadow.destroy();
        this.dragShadow = null;
    }

    this.draggedProp = null;
}
```

**Step 2: Add placement validation method**

Add new method in `FortificationManager`:

```javascript
/**
 * Check if placement position is valid
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {EnvironmentProp} prop - The prop being placed
 * @returns {boolean} True if position valid
 */
isValidPlacement(x, y, prop) {
    // Check world bounds (stay within game area)
    const margin = Math.max(prop.width, prop.height) / 2;
    if (x < margin || x > 1920 - margin || y < margin || y > 1080 - margin) {
        console.log('Out of bounds');
        return false;
    }

    // Check overlap with players
    if (this.scene.playerManager) {
        const players = this.scene.playerManager.getLivingPlayers();
        for (const player of players) {
            const dx = player.getX() - x;
            const dy = player.getY() - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) {
                console.log('Too close to player');
                return false;
            }
        }
    }

    // Allow overlaps with other furniture (intentional stacking)
    // Players can create tight barricades this way

    return true;
}
```

**Step 3: Add visual feedback for invalid placement**

In `onDrag()`, show red tint for invalid positions:

```javascript
onDrag(prop, pointer, dragX, dragY) {
    const sprite = prop.getSprite();
    if (!sprite) return;

    // Check if current position is valid
    const isValid = this.isValidPlacement(pointer.x, pointer.y, prop);

    // Tint sprite red if invalid
    if (!isValid) {
        sprite.setTint(0xff0000);
    } else {
        sprite.clearTint();
    }

    // Update sprite position
    sprite.x = pointer.x;
    sprite.y = pointer.y;

    // ... rest of existing code
}
```

**Step 4: Test placement validation**

Run: `npm start`
- Try dragging furniture out of bounds
- Expected: Item snaps back to previous position, red tint while over invalid area

- Try dragging furniture onto player
- Expected: Red tint, snaps back on release

- Try stacking furniture tightly
- Expected: Allowed (for strategic barricading)

**Step 5: Adjust validation rules if needed**

If validation too strict/loose, adjust `isValidPlacement()` logic.

**Step 6: Commit**

```bash
git add src/systems/FortificationManager.js
git commit -m "$(cat <<'EOF'
feat: add placement validation for fortifications

Prevent placing furniture out of bounds or on top of players.
Show red tint preview for invalid placements. Snap back to
previous position if placement invalid.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Update Between-Waves UI with Wave Number

**Files:**
- Modify: `src/ui/BetweenWavesUI.js`
- Modify: `src/scenes/GameScene.js`

**Step 1: Add wave number parameter to show()**

In `src/ui/BetweenWavesUI.js`, update `show()` method:

```javascript
/**
 * Show the UI overlay
 * @param {number} completedWave - Wave number just completed
 * @param {number} nextWave - Next wave number
 */
show(completedWave, nextWave) {
    if (this.container) {
        // Update title with wave numbers
        const titleText = this.container.list[1]; // Title is second element
        if (titleText) {
            titleText.setText(`WAVE ${completedWave} COMPLETE`);
        }

        // Update instructions with next wave number
        if (this.instructionText) {
            this.instructionText.setText(
                `Drag furniture to build barricades and set traps\n\n` +
                `Wave ${nextWave} incoming...\n\n` +
                `Press SPACE when ready`
            );
        }

        this.container.setVisible(true);
        this.visible = true;
    }
}
```

**Step 2: Pass wave numbers from GameScene**

In `src/scenes/GameScene.js`, update `onEnterBetweenWaves()`:

```javascript
onEnterBetweenWaves() {
    console.log('Entering BETWEEN_WAVES state');

    const completedWave = this.waveManager ? this.waveManager.currentWave : 0;
    const nextWave = completedWave + 1;

    // Show UI overlay with wave numbers
    if (this.betweenWavesUI) {
        this.betweenWavesUI.show(completedWave, nextWave);
    }

    // Spawn fortification items
    if (this.fortificationManager) {
        this.fortificationManager.spawnItemsForWave(nextWave);
    }

    // Pause enemy spawning
    if (this.waveManager) {
        this.waveManager.isSpawning = false;
    }
}
```

**Step 3: Add item preview text**

In `BetweenWavesUI.show()`, add text showing what items are available:

```javascript
show(completedWave, nextWave) {
    if (this.container) {
        // Update title with wave numbers
        const titleText = this.container.list[1];
        if (titleText) {
            titleText.setText(`WAVE ${completedWave} COMPLETE`);
        }

        // Determine items for next wave
        let itemsText = 'Basic Furniture Available';
        if (nextWave >= 3) {
            itemsText = 'Furniture + Explosive Barrels Available';
        }
        if (nextWave >= 5) {
            itemsText = 'Full Arsenal Available (Barrels, Traps, Hazards)';
        }

        // Update instructions with next wave number and items
        if (this.instructionText) {
            this.instructionText.setText(
                `${itemsText}\n\n` +
                `Drag furniture to build barricades and set traps\n\n` +
                `Wave ${nextWave} incoming...\n\n` +
                `Press SPACE when ready`
            );
        }

        this.container.setVisible(true);
        this.visible = true;
    }
}
```

**Step 4: Test wave progression UI**

Run: `npm start` and complete waves 1-5
Expected:
- Wave 1 complete: "WAVE 1 COMPLETE", "Wave 2 incoming...", "Basic Furniture Available"
- Wave 2 complete: "WAVE 2 COMPLETE", "Wave 3 incoming...", "Basic Furniture Available"
- Wave 3 complete: "WAVE 3 COMPLETE", "Wave 4 incoming...", "Furniture + Explosive Barrels Available"
- Wave 5 complete: "Full Arsenal Available"

**Step 5: Commit**

```bash
git add src/ui/BetweenWavesUI.js src/scenes/GameScene.js
git commit -m "$(cat <<'EOF'
feat: update between-waves UI with wave progression info

Display completed wave number and next wave number in UI.
Show progressive unlock hints for available items.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: Final Testing & Bug Fixes

### Task 14: Comprehensive Playtest and Bug Fixing

**Files:**
- Various (as bugs discovered)

**Step 1: Full playthrough test**

Test scenario:
1. Start game
2. Complete waves 1-5
3. Between each wave:
   - Drag furniture into defensive formations
   - Test shooting barrels to explode
   - Stack items tightly
   - Try invalid placements (out of bounds, on player)
4. During waves:
   - Verify enemies collide with furniture
   - Verify enemies attack and destroy furniture
   - Verify explosions damage enemies
   - Verify player can hide behind furniture

**Step 2: Document bugs found**

Create bug list in format:
- Bug: [Description]
- Repro steps: [How to reproduce]
- Expected: [Expected behavior]
- Actual: [Actual behavior]

**Step 3: Fix critical bugs**

Priority order:
1. Game crashes / errors
2. Furniture not spawning
3. Drag-and-drop broken
4. Enemy behavior broken
5. Visual glitches

**Step 4: Fix medium priority bugs**

- Incorrect item counts
- Spawn point issues
- UI display bugs
- Explosion effects not triggering

**Step 5: Fix low priority bugs**

- Visual polish issues
- Minor positioning problems
- Text formatting

**Step 6: Retest after each fix**

After fixing each bug, test that:
- Bug is fixed
- No new bugs introduced
- Related features still work

**Step 7: Commit each bug fix separately**

```bash
git add [affected files]
git commit -m "$(cat <<'EOF'
fix: [brief description of bug fix]

[Detailed explanation of problem and solution]

Fixes: [bug description]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Step 8: Final verification test**

Complete playthrough without bugs
Expected: All features work smoothly, no crashes, good player experience

---

### Task 15: Performance Optimization

**Files:**
- Modify: `src/systems/FortificationManager.js`

**Step 1: Profile fortification update loop**

Add performance timing:

```javascript
update(delta) {
    const startTime = performance.now();

    // Update all fortification props
    this.fortificationProps.forEach(prop => {
        if (prop.update) {
            prop.update(delta);
        }
    });

    // Remove destroyed props
    const beforeCount = this.fortificationProps.length;
    this.fortificationProps = this.fortificationProps.filter(prop => prop.isAlive());
    const afterCount = this.fortificationProps.length;

    if (beforeCount !== afterCount) {
        console.log(`Fortifications: ${beforeCount} -> ${afterCount} (${beforeCount - afterCount} destroyed)`);
    }

    const updateTime = performance.now() - startTime;
    if (updateTime > 5) {
        console.warn(`FortificationManager.update() took ${updateTime.toFixed(2)}ms (slow!)`);
    }
}
```

**Step 2: Test with many items**

Spawn 30-50 fortification items by completing many waves
Run: `npm start` and check console for slow warnings
Expected: Update time should be <2ms per frame

**Step 3: Optimize if needed**

If update is slow (>5ms), optimize by:
- Caching frequently accessed properties
- Reducing health bar updates (only update when damaged)
- Using object pooling for particles

**Step 4: Profile spawn point checking**

Add timing to `getAvailableSpawnPoints()`:

```javascript
getAvailableSpawnPoints() {
    const startTime = performance.now();

    const minDistance = 80;

    const available = this.spawnPoints.filter(spawnPoint => {
        const hasPropNearby = this.fortificationProps.some(prop => {
            const dx = prop.x - spawnPoint.x;
            const dy = prop.y - spawnPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < minDistance;
        });

        return !hasPropNearby;
    });

    const checkTime = performance.now() - startTime;
    if (checkTime > 2) {
        console.warn(`getAvailableSpawnPoints() took ${checkTime.toFixed(2)}ms`);
    }

    return available;
}
```

**Step 5: Optimize spawn checking if needed**

If slow, optimize by:
- Using spatial partitioning (grid-based lookup)
- Caching prop positions between updates
- Limiting number of checks per frame

**Step 6: Remove performance logging**

After optimization, remove or comment out timing code to reduce console spam.

**Step 7: Commit optimizations**

```bash
git add src/systems/FortificationManager.js
git commit -m "$(cat <<'EOF'
perf: optimize fortification system performance

Add performance profiling and optimize update loops.
Ensure smooth gameplay with 30+ concurrent fortifications.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Implementation Complete

### Final Verification Checklist

**Core Features:**
- [ ] BETWEEN_WAVES game state implemented
- [ ] UI overlay shows between waves
- [ ] Press SPACE to start next wave
- [ ] Items spawn at edges after wave completion
- [ ] Initial saloon furniture present at game start
- [ ] Mouse drag-and-drop works for all items
- [ ] Newly spawned items have golden glow
- [ ] Items can be repositioned anytime during between-waves
- [ ] Fortifications persist between waves (position and damage)

**Combat Integration:**
- [ ] Enemies collide with fortifications (physics)
- [ ] Enemies attack and destroy furniture when close
- [ ] Player bullets damage fortifications
- [ ] Shooting explosive barrels triggers explosions
- [ ] Explosions damage nearby enemies and fortifications
- [ ] Chain reactions work (barrel explosions trigger nearby barrels)

**Polish:**
- [ ] Drag shadow shows beneath dragged items
- [ ] Red tint shows for invalid placements
- [ ] Invalid placements snap back to previous position
- [ ] Wave numbers display correctly in UI
- [ ] Item unlock progression works (basic → traps → full arsenal)
- [ ] Spawn points avoid overlapping with existing items
- [ ] Performance acceptable (30+ items, 60fps)

**Known Limitations (Future Work):**
- Enemy pathfinding uses simple avoidance (not A* algorithm)
- No player character pick-up-and-carry mode (drag-only)
- No bear traps implementation (Wave 3-4 unlock)
- No oil slick hazards (Wave 5+ unlock)
- No time limit or countdown timer for between-waves phase
- No shop/upgrade system for purchasing items

---

## Execution Handoff

Plan complete and saved to `docs/plans/2025-12-05-scavenge-and-fortify-system.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
