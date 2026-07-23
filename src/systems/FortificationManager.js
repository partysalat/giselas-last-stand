import { EnvironmentProp, PROP_TYPES } from '../entities/EnvironmentProp.js';
import { screenToWorld, WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Y, WORLD_MAX_Y } from '../utils/CoordinateTransform.js';
import { PhysicsManager } from './PhysicsManager.js';
import { FireSystem } from './FireSystem.js';
import { DestructionManager } from './DestructionManager.js';

/**
 * Manages fortification items: automatic strategic placement, persistence
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
            { radius: 5, waves: [10, 11, 12], propCount: 8 }     // Core ring
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
        // Note: If all positions are blocked, some props won't spawn (acceptable - player created tight defense)
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
