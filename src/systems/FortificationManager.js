import { EnvironmentProp, PROP_TYPES } from '../entities/EnvironmentProp.js';
import { screenToWorld, WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Y, WORLD_MAX_Y } from '../utils/CoordinateTransform.js';

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
     * Initialize spawn points around saloon perimeter (in WORLD coordinates)
     */
    initializeSpawnPoints() {
        // Convert screen coordinates to world coordinates
        const screenSpawnPoints = [
            // Top edge
            { x: 300, y: 200 },   // Top-left corner
            { x: 640, y: 200 },   // Top-left mid
            { x: 960, y: 200 },   // Top-center
            { x: 1280, y: 200 },  // Top-right mid
            { x: 1620, y: 200 },  // Top-right corner

            // Right edge
            { x: 1700, y: 440 },  // Right-mid-top
            { x: 1700, y: 640 },  // Right-mid-bottom

            // Bottom edge
            { x: 1620, y: 880 },  // Bottom-right corner
            { x: 1280, y: 880 },  // Bottom-right mid
            { x: 960, y: 880 },   // Bottom-center
            { x: 640, y: 880 },   // Bottom-left mid
            { x: 300, y: 880 },   // Bottom-left corner

            // Left edge
            { x: 220, y: 640 },   // Left-mid-bottom
            { x: 220, y: 440 }    // Left-mid-top
        ];

        // Convert all spawn points from SCREEN to WORLD coordinates
        this.spawnPoints = screenSpawnPoints.map(point => {
            const worldPos = screenToWorld(point.x, point.y, 0);
            return {
                worldX: worldPos.worldX,
                worldY: worldPos.worldY,
                active: true
            };
        });

        console.log('Spawn points initialized:', this.spawnPoints.length);
    }

    /**
     * Spawn initial saloon furniture in "normal" positions
     */
    spawnInitialFurniture() {
        console.log('Spawning initial saloon furniture');

        // Helper function to convert screen to world coordinates
        const spawnAt = (type, screenX, screenY, isNew) => {
            const worldPos = screenToWorld(screenX, screenY, 0);
            this.spawnFortificationProp(type, worldPos.worldX, worldPos.worldY, isNew);
        };

        // Bar counter (top-left area)
        spawnAt('barCounter', 300, 400, false);

        // Piano (top-right area)
        spawnAt('piano', 1620, 400, false);

        // Card tables (scattered around)
        spawnAt('cardTable', 700, 500, false);
        spawnAt('cardTable', 1220, 500, false);

        // Chairs around tables
        spawnAt('woodenChair', 650, 450, false);
        spawnAt('woodenChair', 750, 450, false);
        spawnAt('woodenChair', 1170, 450, false);
        spawnAt('woodenChair', 1270, 450, false);

        // Barrels in corners
        spawnAt('barrel', 200, 250, false);
        spawnAt('barrel', 1720, 250, false);

        // Bar stools at bar
        spawnAt('barStool', 250, 400, false);
        spawnAt('barStool', 350, 400, false);

        console.log(`Spawned ${this.fortificationProps.length} initial furniture pieces`);
    }

    /**
     * Spawn new items at spawn points based on wave number
     * @param {number} waveNumber - Current wave number
     */
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

        // Spawn items at available spawn points (using WORLD coordinates)
        let spawnIndex = 0;
        itemsToSpawn.forEach(itemType => {
            if (spawnIndex >= availableSpawnPoints.length) {
                console.warn('Not enough spawn points for all items');
                return;
            }

            const spawnPoint = availableSpawnPoints[spawnIndex];
            this.spawnFortificationProp(itemType, spawnPoint.worldX, spawnPoint.worldY, true);
            spawnIndex++;
        });
    }

    /**
     * Get spawn points that don't have props nearby
     * @returns {Array} Available spawn points
     */
    getAvailableSpawnPoints() {
        const minDistance = 80; // Minimum distance from existing props

        return this.spawnPoints.filter(spawnPoint => {
            // Check if any fortification prop is too close (use WORLD coordinates)
            const hasPropNearby = this.fortificationProps.some(prop => {
                const dx = prop.worldX - spawnPoint.worldX;
                const dy = prop.worldY - spawnPoint.worldY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < minDistance;
            });

            return !hasPropNearby;
        });
    }

    /**
     * Determine which items to spawn for a given wave
     * @param {number} waveNumber - Current wave number
     * @returns {Array<string>} Array of prop type keys
     */
    getItemsForWave(waveNumber) {
        // Wave 1-2: Basic furniture including some heavy pieces
        if (waveNumber <= 2) {
            return [
                'woodenChair', 'woodenChair', 'cardTable',
                'barrel', 'smallCrate', 'barStool', 'barStool',
                'heavyBookshelf'
            ];
        }

        // Wave 3-4: Add explosive traps and heavy cover
        if (waveNumber <= 4) {
            return [
                'woodenChair', 'cardTable', 'barrel', 'smallCrate',
                'barStool', 'gunpowderKeg', 'whiskeyBarrel',
                'heavyBookshelf', 'flippedPokerTable'
            ];
        }

        // Wave 5-6: More explosives, variety, and heavy objects
        if (waveNumber <= 6) {
            return [
                'woodenChair', 'cardTable', 'barrel', 'smallCrate',
                'gunpowderKeg', 'oilLamp', 'whiskeyBarrel', 'gasLantern',
                'heavyBookshelf', 'safe'
            ];
        }

        // Wave 7+: Full arsenal with heavy explosives and fortifications
        return [
            'woodenChair', 'cardTable', 'barrel', 'smallCrate', 'barStool',
            'gunpowderKeg', 'oilLamp', 'whiskeyBarrel', 'gasLantern', 'dynamiteCrate',
            'heavyBookshelf', 'safe', 'flippedPokerTable'
        ];
    }

    /**
     * Spawn a fortification prop at a specific location
     * @param {string} propType - Prop type key from PROP_TYPES
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @param {boolean} isNewSpawn - Whether this is a newly spawned item (shows glow)
     */
    spawnFortificationProp(propType, worldX, worldY, isNewSpawn = false) {
        const prop = new EnvironmentProp(this.scene, worldX, worldY, propType);

        // Mark as fortification prop
        prop.isFortification = true;
        prop.isNewSpawn = isNewSpawn;

        // Add visual glow for new spawns
        if (isNewSpawn) {
            this.addSpawnGlow(prop);
        }

        // Enable drag-and-drop
        this.makeDraggable(prop);

        // Setup collision with players
        this.setupPlayerCollision(prop);

        // Track in fortifications array
        this.fortificationProps.push(prop);

        console.log(`Spawned fortification prop: ${propType} at world (${worldX}, ${worldY})`);

        return prop;
    }

    /**
     * Setup collision between prop and all players
     * @param {EnvironmentProp} prop - The prop to setup collision for
     */
    setupPlayerCollision(prop) {
        const sprite = prop.getSprite();
        if (!sprite || !sprite.body) {
            // No physics body (hazard props like oil lamps, explosives)
            return;
        }

        // Add collision with player manager if it exists
        if (this.scene.playerManager) {
            const players = this.scene.playerManager.getLivingPlayers();
            players.forEach(player => {
                if (player.sprite) {
                    this.scene.physics.add.collider(player.sprite, sprite);
                }
            });
        }
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
        // Only allow dragging during BETWEEN_WAVES state
        if (this.scene.gameState !== 'between_waves') {
            console.log('Cannot drag props during active wave');
            return;
        }

        console.log(`Drag start: ${prop.name}`);
        this.draggedProp = prop;
        this.dragStartX = prop.x;  // Screen coord
        this.dragStartY = prop.y;  // Screen coord
        this.dragStartWorldX = prop.worldX;  // World coord
        this.dragStartWorldY = prop.worldY;  // World coord

        const sprite = prop.getSprite();
        if (sprite) {
            sprite.setAlpha(0.7);
            sprite.setDepth(200); // Bring to front while dragging

            // Add drag shadow
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

    /**
     * Handle drag movement
     */
    onDrag(prop, pointer, dragX, dragY) {
        // Only allow dragging during BETWEEN_WAVES state
        if (this.scene.gameState !== 'between_waves') {
            return;
        }

        const sprite = prop.getSprite();
        if (!sprite) return;

        // Convert pointer SCREEN position to WORLD coordinates
        const worldPos = screenToWorld(pointer.x, pointer.y, prop.worldZ);

        // Check if current position is valid (in WORLD space)
        const isValid = this.isValidPlacement(worldPos.worldX, worldPos.worldY, prop);

        // Tint sprite red if invalid (only for Image/Sprite objects that support tinting)
        if (sprite.setTint && sprite.clearTint) {
            if (!isValid) {
                sprite.setTint(0xff0000);
            } else {
                sprite.clearTint();
            }
        } else if (sprite.setFillStyle) {
            // For Rectangle shapes, change fill color
            if (!isValid) {
                sprite.setFillStyle(0xff0000, 0.5);
            } else {
                sprite.setFillStyle(sprite._originalColor || 0xffffff, sprite._originalAlpha || 1);
            }
        }

        // Update sprite position (SCREEN coordinates)
        sprite.x = pointer.x;
        sprite.y = pointer.y;

        // Update prop positions (both SCREEN and WORLD)
        prop.x = pointer.x;
        prop.y = pointer.y;
        prop.worldX = worldPos.worldX;
        prop.worldY = worldPos.worldY;

        // Update shadow position
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

        // Update sprite bounds debug visualization if exists
        if (prop.spriteBoundsDebug) {
            prop.spriteBoundsDebug.x = pointer.x;
            prop.spriteBoundsDebug.y = pointer.y;
        }

        // Update depth during drag for proper isometric sorting
        const baseDepthMap = {
            'floor': 2,
            'ground': 5,
            'wall': 4,
            'table': 6,
            'structure': 7,
            'ceiling': 35
        };
        const baseDepth = baseDepthMap[prop.layer] || 5;
        const spriteBottom = pointer.y + (sprite.displayHeight / 2);
        const depthOffset = spriteBottom / 10;
        sprite.setDepth(baseDepth + depthOffset);
    }

    /**
     * Handle drag end
     */
    onDragEnd(prop, pointer, dragX, dragY) {
        // Only allow dragging during BETWEEN_WAVES state
        if (this.scene.gameState !== 'between_waves') {
            return;
        }

        console.log(`Drag end: ${prop.name} at (${pointer.x}, ${pointer.y})`);

        // Convert final pointer position to world coordinates
        const worldPos = screenToWorld(pointer.x, pointer.y, prop.worldZ);

        // Validate placement position (in WORLD space)
        const isValidPosition = this.isValidPlacement(worldPos.worldX, worldPos.worldY, prop);

        if (!isValidPosition) {
            console.log('Invalid placement - returning to start position');

            // Return to drag start position (both SCREEN and WORLD)
            const sprite = prop.getSprite();
            if (sprite) {
                sprite.x = this.dragStartX;
                sprite.y = this.dragStartY;
            }
            prop.x = this.dragStartX;
            prop.y = this.dragStartY;
            prop.worldX = this.dragStartWorldX;
            prop.worldY = this.dragStartWorldY;

            // Update physics body
            if (sprite && sprite.body) {
                sprite.body.x = this.dragStartX - sprite.body.width / 2;
                sprite.body.y = this.dragStartY - sprite.body.height / 2;
            }

            // Update health bar position if exists
            if (prop.healthBarBg && prop.healthBarFill) {
                prop.healthBarBg.x = this.dragStartX;
                prop.healthBarBg.y = this.dragStartY - prop.height / 2 - 10;

                const healthPercent = prop.getHealthPercent();
                prop.healthBarFill.x = this.dragStartX - prop.width / 2 + (prop.width * healthPercent) / 2;
                prop.healthBarFill.y = this.dragStartY - prop.height / 2 - 10;
            }

            // Update sprite bounds debug visualization if exists
            if (prop.spriteBoundsDebug) {
                prop.spriteBoundsDebug.x = this.dragStartX;
                prop.spriteBoundsDebug.y = this.dragStartY;
            }
        }

        const sprite = prop.getSprite();
        if (sprite) {
            sprite.setAlpha(1.0);

            // Clear red tint if present (only for objects that support tinting)
            if (sprite.clearTint) {
                sprite.clearTint();
            } else if (sprite.setFillStyle && sprite._originalColor) {
                // Restore original color for Rectangle shapes
                sprite.setFillStyle(sprite._originalColor, sprite._originalAlpha || 1);
            }

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
        const beforeCount = this.fortificationProps.length;
        this.fortificationProps = this.fortificationProps.filter(prop => prop.isAlive());
        const afterCount = this.fortificationProps.length;

        if (beforeCount !== afterCount) {
            console.log(`Fortifications: ${beforeCount} -> ${afterCount} (${beforeCount - afterCount} destroyed)`);
        }
    }

    /**
     * Check if there's an obstacle at a position
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @param {number} radius - Check radius in world units (default 0.6)
     * @returns {boolean} True if obstacle present
     */
    checkObstacleAt(worldX, worldY, radius = 0.6) {  // 30 pixels = 0.6 world units
        return this.fortificationProps.some(prop => {
            if (!prop.isAlive()) return false;

            // Use rectangle-to-circle collision detection for more accurate checks
            const halfWidth = prop.volumeWidth / 2;
            const halfDepth = prop.volumeDepth / 2;

            // Find the closest point on the rectangle to the circle center
            const closestX = Math.max(prop.worldX - halfWidth, Math.min(worldX, prop.worldX + halfWidth));
            const closestY = Math.max(prop.worldY - halfDepth, Math.min(worldY, prop.worldY + halfDepth));

            // Calculate distance from circle center to closest point
            const dx = worldX - closestX;
            const dy = worldY - closestY;
            const distanceSquared = dx * dx + dy * dy;

            return distanceSquared < (radius * radius);
        });
    }

    /**
     * Check if placement position is valid
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @param {EnvironmentProp} prop - The prop being placed
     * @returns {boolean} True if position valid
     */
    isValidPlacement(worldX, worldY, prop) {
        // Check world bounds (use WORLD space bounds)
        const margin = Math.max(prop.volumeWidth, prop.volumeDepth) / 2;

        if (worldX < WORLD_MIN_X + margin || worldX > WORLD_MAX_X - margin ||
            worldY < WORLD_MIN_Y + margin || worldY > WORLD_MAX_Y - margin) {
            console.log('Out of bounds');
            return false;
        }

        // Check overlap with players (use WORLD coordinates)
        if (this.scene.playerManager) {
            const players = this.scene.playerManager.getLivingPlayers();
            for (const player of players) {
                const dx = player.worldX - worldX;
                const dy = player.worldY - worldY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 5) { // 5 world units radius
                    console.log('Too close to player');
                    return false;
                }
            }
        }

        // Allow overlaps with other furniture (intentional stacking)
        // Players can create tight barricades this way

        return true;
    }

    /**
     * Restore health to all surviving fortification props
     * Called at the start of between-waves phase
     */
    restoreAllPropsHealth() {
        let restoredCount = 0;
        this.fortificationProps.forEach(prop => {
            if (prop.isAlive() && prop.restoreHealth) {
                prop.restoreHealth();
                restoredCount++;
            }
        });

        if (restoredCount > 0) {
            console.log(`Restored health to ${restoredCount} fortification props`);
        }
    }

    /**
     * Enable dragging for all fortification props (called when entering BETWEEN_WAVES)
     */
    enablePropDragging() {
        console.log('Enabling prop dragging');
        this.fortificationProps.forEach(prop => {
            const sprite = prop.getSprite();
            if (sprite) {
                sprite.input.enabled = true;
            }
        });
    }

    /**
     * Disable dragging for all fortification props (called when entering WAVE_ACTIVE)
     */
    disablePropDragging() {
        console.log('Disabling prop dragging');
        this.fortificationProps.forEach(prop => {
            const sprite = prop.getSprite();
            if (sprite) {
                sprite.input.enabled = false;
            }
        });
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
