import { EnvironmentProp, PROP_TYPES } from '../entities/EnvironmentProp.js';
import { PhysicsManager } from './PhysicsManager.js';
import { FireSystem } from './FireSystem.js';
import { DestructionManager } from './DestructionManager.js';
import { screenToWorld } from '../utils/CoordinateTransform.js';

/**
 * EnvironmentManager
 * Manages all environment props in the scene
 * Handles spawning, collision detection, and prop lifecycle
 */
export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.props = [];
        this.layout = null;
        this.destructionLevel = 0;

        // Initialize PhysicsManager (Phase 2)
        this.physicsManager = new PhysicsManager(scene);

        // Initialize FireSystem (Phase 3)
        this.fireSystem = new FireSystem(scene);

        // Initialize DestructionManager (Phase 5)
        this.destructionManager = new DestructionManager(scene);
    }

    /**
     * Initialize environment for a wave
     */
    initialize(waveNumber) {
        // For Phase 1, use a fixed layout similar to old CoverManager
        this.spawnPropsForWave(waveNumber);
    }

    /**
     * Spawn props for the current wave
     * Phase 1: Use fixed layout compatible with existing system
     * Phase 5: Add chandeliers (only once at wave 1)
     */
    spawnPropsForWave(waveNumber) {
        // Clear existing props (but preserve chandeliers)
        this.clearAllPropsExceptPersistent();

        // Initialize destruction manager for this wave
        this.destructionManager.initializeForWave(waveNumber);

        // Fixed layout matching old CoverManager positions
        // Using new prop types from EnvironmentProp
        const propLayout = [
            // Phase 7: Heavy Cover props
            { type: 'piano', x: 500, y: 700 },
            { type: 'heavyBookshelf', x: 1420, y: 700 },
            { type: 'safe', x: 960, y: 450 },

            // Phase 7: Light Cover props
            { type: 'cardTable', x: 700, y: 750 },
            { type: 'cardTable', x: 650, y: 350 },
            { type: 'cardTable', x: 1270, y: 350 },
            { type: 'woodenChair', x: 800, y: 600 },
            { type: 'woodenChair', x: 1100, y: 600 },
            { type: 'barStool', x: 1160, y: 750 },
            { type: 'barStool', x: 1280, y: 750 },
            { type: 'smallCrate', x: 550, y: 500 },
            { type: 'smallCrate', x: 1370, y: 500 },
            { type: 'barrel', x: 750, y: 550 },
            { type: 'barrel', x: 1150, y: 550 },

            // Phase 7: Hazard Props
            { type: 'oilLamp', x: 700, y: 700 }, // On card table
            { type: 'whiskeyBarrel', x: 820, y: 600 },
            { type: 'dynamiteCrate', x: 1080, y: 600 },
            { type: 'gasLantern', x: 650, y: 300 },
            { type: 'gasLantern', x: 1270, y: 300 },

            // Phase 7: Tactical Props
            { type: 'bellRope', x: 400, y: 200 }, // Left side ceiling
            { type: 'stageLights', x: 600, y: 200 }, // Left stage light
            { type: 'stageLights', x: 1320, y: 200 }, // Right stage light

            // Phase 7: Special Props
            { type: 'waterTrough', x: 960, y: 800 } // Center bottom
        ];

        // Phase 5: Add chandeliers only on first wave
        if (waveNumber === 1) {
            propLayout.push(
                { type: 'chandelier', x: 500, y: 200 }, // Left chandelier
                { type: 'chandelier', x: 960, y: 250 }, // Center chandelier
                { type: 'chandelier', x: 1420, y: 200 } // Right chandelier
            );
        }

        // Phase 6: Support beams removed - too cluttered

        // Phase 6: Add trapdoors (closed initially, can be opened by boss attacks/explosions)
        // Trapdoors spawn at wave 1 but start closed/inactive
        if (waveNumber === 1) {
            propLayout.push(
                { type: 'trapdoor', x: 600, y: 650 }, // Left trapdoor
                { type: 'trapdoor', x: 1320, y: 650 } // Right trapdoor
            );
        }

        this.spawnProps(propLayout);
    }

    /**
     * Spawn props from a layout configuration
     */
    spawnProps(layout) {
        layout.forEach(propData => {
            // Convert screen coords to world coords
            const { worldX, worldY } = screenToWorld(propData.x, propData.y, 0);

            const prop = new EnvironmentProp(
                this.scene,
                worldX,
                worldY,
                propData.type
            );
            this.props.push(prop);

            // Phase 5: Register chandeliers with destruction manager
            if (propData.type === 'chandelier' && this.destructionManager) {
                this.destructionManager.registerChandelier(prop);
            }

            // Only add collision for props with physics bodies (non-hazard props)
            const sprite = prop.getSprite();
            if (!sprite || !sprite.body) {
                // Skip collision for props without physics bodies (hazards, explosives)
                return;
            }

            // Add collision with player if player exists
            if (this.scene.player) {
                this.scene.physics.add.collider(
                    this.scene.player.sprite,
                    sprite
                );
            }

            // Add collision with player manager if it exists
            if (this.scene.playerManager) {
                const players = this.scene.playerManager.getLivingPlayers();
                players.forEach(player => {
                    if (player.sprite) {
                        this.scene.physics.add.collider(
                            player.sprite,
                            sprite
                        );
                    }
                });
            }
        });
    }

    /**
     * Update all props
     */
    update(delta) {
        // Update physics manager (Phase 2)
        this.physicsManager.update(delta);

        // Update fire system (Phase 3)
        this.fireSystem.update(delta);

        // Update each prop
        this.props.forEach(prop => {
            if (prop.isAlive()) {
                prop.update(delta);
            }
        });

        // Clean up dead props
        this.cleanup();
    }

    /**
     * Check for player interaction with tactical props (Phase 4)
     * Returns the nearest interactive prop within activation radius
     */
    getNearbyInteractiveProp(playerX, playerY) {
        let nearestProp = null;
        let nearestDistance = Infinity;

        this.props.forEach(prop => {
            if (!prop.isAlive() || !prop.interactive) return;

            const dx = prop.x - playerX;
            const dy = prop.y - playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < prop.activationRadius && dist < nearestDistance) {
                nearestDistance = dist;
                nearestProp = prop;
            }
        });

        return nearestProp;
    }

    /**
     * Activate a tactical prop (Phase 4)
     */
    activateTacticalProp(prop, playerX, playerY) {
        if (!prop || !prop.interactive) return false;
        return prop.activate(playerX, playerY);
    }

    /**
     * Remove destroyed props from the array
     */
    cleanup() {
        this.props = this.props.filter(prop => prop.isAlive());
    }

    /**
     * Clear all props except persistent ones (chandeliers)
     * Phase 5: Keep chandeliers across waves
     */
    clearAllPropsExceptPersistent() {
        const persistentTypes = ['chandelier'];

        // Separate persistent props from regular props
        const persistentProps = [];
        const propsToRemove = [];

        this.props.forEach(prop => {
            if (persistentTypes.includes(prop.type)) {
                persistentProps.push(prop);
            } else {
                propsToRemove.push(prop);
            }
        });

        // Destroy non-persistent props
        propsToRemove.forEach(prop => {
            if (prop.isAlive()) {
                prop.destroy();
            }
        });

        // Keep only persistent props
        this.props = persistentProps;
    }

    /**
     * Clear all props from the scene (including persistent ones)
     */
    clearAllProps() {
        this.props.forEach(prop => {
            if (prop.isAlive()) {
                prop.destroy();
            }
        });
        this.props = [];
    }

    /**
     * Check if a bullet collides with any prop
     * Returns true if bullet was blocked
     */
    checkBulletCollision(bulletX, bulletY, bulletDamage) {
        for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];

            if (!prop.isAlive()) continue;

            if (prop.checkBulletCollision(bulletX, bulletY)) {
                // Bullet hit this prop
                prop.takeDamage(bulletDamage);

                // Phase 5: Track damage with destruction manager
                if (this.destructionManager) {
                    this.destructionManager.trackDamage(prop, bulletDamage);
                }

                return true; // Bullet was blocked
            }
        }

        return false; // Bullet not blocked
    }

    /**
     * Damage all props in a radius (for explosions)
     */
    damagePropsInRadius(x, y, radius, damage, excludeProp = null) {
        this.props.forEach(prop => {
            if (!prop.isAlive()) return;
            if (prop === excludeProp) return;

            const dx = prop.x - x;
            const dy = prop.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                prop.takeDamage(damage);

                // Phase 5: Track damage with destruction manager
                if (this.destructionManager) {
                    this.destructionManager.trackDamage(prop, damage);
                }
            }
        });
    }

    /**
     * Get all active props
     */
    getProps() {
        return this.props.filter(prop => prop.isAlive());
    }

    /**
     * Get props in a specific radius
     */
    getPropsInRadius(x, y, radius) {
        return this.props.filter(prop => {
            if (!prop.isAlive()) return false;

            const dx = prop.x - x;
            const dy = prop.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            return dist <= radius;
        });
    }

    /**
     * Find nearest cover prop to a position
     */
    findNearestCover(x, y, maxDistance = Infinity) {
        let nearest = null;
        let nearestDist = maxDistance;

        this.props.forEach(prop => {
            if (!prop.isAlive() || !prop.blocksBullets) return;

            const dx = prop.x - x;
            const dy = prop.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = prop;
            }
        });

        return nearest;
    }

    /**
     * Get current destruction level (0-100)
     * Based on percentage of props destroyed
     */
    getDestructionLevel() {
        if (this.props.length === 0) return 0;

        const totalInitial = this.props.length;
        const alive = this.props.filter(p => p.isAlive()).length;
        return Math.floor(((totalInitial - alive) / totalInitial) * 100);
    }

    /**
     * Prepare environment for next wave
     * Phase 1: Just respawn props
     */
    prepareForWave(waveNumber) {
        this.initialize(waveNumber);
    }

    /**
     * Transition cleanup between waves
     */
    transitionToNextWave() {
        // Phase 1: Simple cleanup
        // Later phases will add environmental state changes
        this.cleanup();
    }

    /**
     * Setup boss-specific arena configuration
     * Phase 1: Placeholder for future boss integration
     */
    setupBossArena(bossType) {
        // Will be implemented in Phase 6
        console.log(`Boss arena setup for ${bossType} - not yet implemented`);
    }

    /**
     * Destroy all props in a radius (for boss attacks)
     */
    destroyPropsInRadius(x, y, radius) {
        this.props.forEach(prop => {
            if (!prop.isAlive()) return;

            const dx = prop.x - x;
            const dy = prop.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                prop.destroy();
            }
        });
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
     * Spawns props for the current wave
     */
    spawnCoverForWave() {
        this.spawnPropsForWave(this.scene.waveManager ? this.scene.waveManager.currentWave : 1);
    }

    /**
     * Compatibility method for old CoverManager API
     * Clears all props
     */
    clearAllCover() {
        this.clearAllProps();
    }

    /**
     * Compatibility method for old CoverManager API
     * Damage props in radius (used by boss attacks)
     */
    damageInRadius(x, y, radius, damage) {
        this.damagePropsInRadius(x, y, radius, damage);
    }
}
