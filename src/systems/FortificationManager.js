import { EnvironmentProp, PROP_TYPES } from '../entities/EnvironmentProp.js';
import { screenToWorld, WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Y, WORLD_MAX_Y } from '../utils/CoordinateTransform.js';
import { PhysicsManager } from './PhysicsManager.js';
import { FireSystem } from './FireSystem.js';
import { DestructionManager } from './DestructionManager.js';

/**
 * Manages fortification items: spawning, drag-and-drop, persistence
 * Also manages environmental systems (fire, physics, destruction)
 */
export class FortificationManager {
    constructor(scene) {
        this.scene = scene;
        this.fortificationProps = []; // All props that can be moved

        // Ring-based placement system
        this.defensiveRings = [
            { radius: 12, waves: [1, 2, 3], propCount: 8 },      // Outer ring
            { radius: 8, waves: [4, 5, 6], propCount: 10 },      // Middle ring
            { radius: 5, waves: [7, 8, 9], propCount: 12 },      // Inner ring
            { radius: 3, waves: [10, 11, 12], propCount: 8 }     // Core ring
        ];

        // Center of world space (15, 12 = center of 30x25 world grid)
        // Ring validation: max radius 12 from center (15,12) = edges at (3-27, 0-24) within bounds (0-30, 0-25) ✓
        this.saloonCenter = { worldX: 15, worldY: 12 };

        // Initialize environmental systems
        this.physicsManager = new PhysicsManager(scene);
        this.fireSystem = new FireSystem(scene);
        this.destructionManager = new DestructionManager(scene);

        console.log('FortificationManager initialized with ring-based placement');
    }

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

        // Phase 5: Spawn 3 chandeliers (left, center, right)
        spawnAt('chandelier', 500, 200, false);
        spawnAt('chandelier', 960, 250, false);
        spawnAt('chandelier', 1420, 200, false);

        console.log(`Spawned ${this.fortificationProps.length} initial furniture pieces (including chandeliers)`);
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
        // Minimum distance in world units (1.6 world units = 80 pixels)
        const minDistance = 1.6;

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

        // Phase 5: Register chandeliers with DestructionManager
        if (propType === 'chandelier' && this.destructionManager) {
            this.destructionManager.registerChandelier(prop);
        }

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

    /**
     * Update systems (fire, physics)
     */
    update(delta) {
        // Update physics manager
        this.physicsManager.update(delta);

        // Update fire system
        this.fireSystem.update(delta);

        // Update each prop
        this.fortificationProps.forEach(prop => {
            if (prop.isAlive()) {
                prop.update(delta);
            }
        });

        // Clean up dead props
        this.fortificationProps = this.fortificationProps.filter(prop => prop.isAlive());
    }

    /**
     * Get all active props
     */
    getProps() {
        return this.fortificationProps.filter(prop => prop.isAlive());
    }

    /**
     * Get props in a specific radius (WORLD coordinates)
     */
    getPropsInRadius(x, y, radius) {
        return this.fortificationProps.filter(prop => {
            if (!prop.isAlive()) return false;

            const dx = prop.worldX - x;
            const dy = prop.worldY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            return dist <= radius;
        });
    }

    /**
     * Damage all props in a radius (WORLD coordinates)
     */
    damagePropsInRadius(x, y, radius, damage, excludeProp = null) {
        this.fortificationProps.forEach(prop => {
            if (!prop.isAlive()) return;
            if (prop === excludeProp) return;

            const dx = prop.worldX - x;
            const dy = prop.worldY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                prop.takeDamage(damage);

                // Track damage with destruction manager
                if (this.destructionManager) {
                    this.destructionManager.trackDamage(prop, damage);
                }
            }
        });
    }

    /**
     * Check for player interaction with tactical props
     * Returns the nearest interactive prop within activation radius
     */
    getNearbyInteractiveProp(playerWorldX, playerWorldY) {
        let nearestProp = null;
        let nearestDistance = Infinity;

        this.fortificationProps.forEach(prop => {
            if (!prop.isAlive() || !prop.interactive) return;

            const dx = prop.worldX - playerWorldX;
            const dy = prop.worldY - playerWorldY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // activationRadius is in world units
            if (dist < prop.activationRadius && dist < nearestDistance) {
                nearestDistance = dist;
                nearestProp = prop;
            }
        });

        return nearestProp;
    }

    /**
     * Activate a tactical prop
     */
    activateTacticalProp(prop, playerWorldX, playerWorldY) {
        if (!prop || !prop.interactive) return false;
        return prop.activate(playerWorldX, playerWorldY);
    }

    /**
     * Compatibility method for old CoverManager API
     * Returns props array in the format expected by existing code
     */
    getCovers() {
        return this.getProps();
    }

    /**
     * Compatibility method for old CoverManager API
     * Damage props in radius (alternative method name)
     */
    damageInRadius(x, y, radius, damage) {
        return this.damagePropsInRadius(x, y, radius, damage);
    }

    /**
     * Compatibility method for old CoverManager API
     * Check bullet collision (legacy signature without Z)
     */
    checkBulletCollision(bulletX, bulletY, bulletZOrDamage, damage) {
        // Handle both signatures:
        // checkBulletCollision(x, y, z, damage) - new signature with Z
        // checkBulletCollision(x, y, damage) - legacy signature without Z
        let bulletZ = 0;
        let bulletDamage = damage;

        if (damage === undefined) {
            // Legacy signature: (x, y, damage)
            bulletDamage = bulletZOrDamage;
            bulletZ = 0;
        } else {
            // New signature: (x, y, z, damage)
            bulletZ = bulletZOrDamage;
        }

        for (let i = 0; i < this.fortificationProps.length; i++) {
            const prop = this.fortificationProps[i];

            if (!prop.isAlive()) continue;

            if (prop.checkBulletCollision(bulletX, bulletY, bulletZ)) {
                // Bullet hit this prop
                prop.takeDamage(bulletDamage);

                // Track damage with destruction manager
                if (this.destructionManager) {
                    this.destructionManager.trackDamage(prop, bulletDamage);
                }

                return true; // Bullet was blocked
            }
        }

        return false; // Bullet not blocked
    }
}
