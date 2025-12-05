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

        // Update prop position
        prop.x = pointer.x;
        prop.y = pointer.y;

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
    }

    /**
     * Handle drag end
     */
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

            // Update health bar position if exists
            if (prop.healthBarBg && prop.healthBarFill) {
                prop.healthBarBg.x = this.dragStartX;
                prop.healthBarBg.y = this.dragStartY - prop.height / 2 - 10;

                const healthPercent = prop.getHealthPercent();
                prop.healthBarFill.x = this.dragStartX - prop.width / 2 + (prop.width * healthPercent) / 2;
                prop.healthBarFill.y = this.dragStartY - prop.height / 2 - 10;
            }
        }

        const sprite = prop.getSprite();
        if (sprite) {
            sprite.setAlpha(1.0);
            sprite.clearTint(); // Clear red tint if present

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
