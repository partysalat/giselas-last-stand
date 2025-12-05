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
