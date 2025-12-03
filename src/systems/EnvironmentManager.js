import { EnvironmentProp, PROP_TYPES } from '../entities/EnvironmentProp.js';
import { PhysicsManager } from './PhysicsManager.js';
import { FireSystem } from './FireSystem.js';

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
     */
    spawnPropsForWave(waveNumber) {
        // Clear existing props
        this.clearAllProps();

        // Fixed layout matching old CoverManager positions
        // Using new prop types from EnvironmentProp
        const propLayout = [
            { type: 'cardTable', x: 700, y: 750 },
            { type: 'barCounter', x: 1220, y: 750 },
            // Move explosive barrels CLOSE to other props for physics demo
            { type: 'explosiveBarrel', x: 820, y: 600 }, // Near chairs
            { type: 'explosiveBarrel', x: 1080, y: 600 }, // Near chairs
            { type: 'cardTable', x: 650, y: 350 },
            { type: 'barCounter', x: 960, y: 300 },
            { type: 'cardTable', x: 1270, y: 350 },
            // Add some new props to showcase the system
            { type: 'woodenChair', x: 800, y: 600 },
            { type: 'woodenChair', x: 1100, y: 600 },
            { type: 'barrel', x: 750, y: 550 }, // Closer to explosive barrel
            { type: 'barrel', x: 1150, y: 550 }, // Closer to explosive barrel
            // Phase 3: Add oil lamps for fire system testing
            { type: 'oilLamp', x: 700, y: 700 }, // On card table
            { type: 'oilLamp', x: 1220, y: 700 }, // On bar counter
            { type: 'oilLamp', x: 650, y: 300 }, // On another table
            { type: 'oilLamp', x: 1270, y: 300 } // On another table
        ];

        this.spawnProps(propLayout);
    }

    /**
     * Spawn props from a layout configuration
     */
    spawnProps(layout) {
        layout.forEach(propData => {
            const prop = new EnvironmentProp(
                this.scene,
                propData.x,
                propData.y,
                propData.type
            );
            this.props.push(prop);

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
     * Remove destroyed props from the array
     */
    cleanup() {
        this.props = this.props.filter(prop => prop.isAlive());
    }

    /**
     * Clear all props from the scene
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
}
