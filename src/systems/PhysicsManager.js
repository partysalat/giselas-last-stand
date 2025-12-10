import { screenToWorld, worldToScreen, calculateDepth } from '../utils/CoordinateTransform.js';
import { ISOMETRIC_CONFIG } from '../config.js';

/**
 * PhysicsManager
 * Handles physics-based movement and collisions for environment props
 * Manages weight classes, knockback, rolling/sliding, and impact damage
 * Note: Phaser physics works in SCREEN space, but we keep world coordinates synchronized
 */
export class PhysicsManager {
    constructor(scene) {
        this.scene = scene;
        this.movingProps = []; // Props currently in motion
    }

    /**
     * Apply force to a prop based on weight class
     * @param {EnvironmentProp} prop - The prop to apply force to
     * @param {number} forceX - Force in X direction
     * @param {number} forceY - Force in Y direction
     * @param {string} source - Source of force ('explosion', 'contact', 'boss')
     */
    applyForce(prop, forceX, forceY, source = 'explosion') {
        if (!prop.isAlive()) return;

        // Check if prop can move based on weight class
        const canMove = this.canPropMove(prop, source);
        if (!canMove) return;

        // Calculate movement distance based on weight class and force
        const movementMultiplier = this.getMovementMultiplier(prop.weightClass);
        const velocityX = forceX * movementMultiplier;
        const velocityY = forceY * movementMultiplier;

        // Store physics data on the prop
        if (!prop.physicsData) {
            prop.physicsData = {
                velocityX: 0,
                velocityY: 0,
                friction: this.getFriction(prop),
                impactDamage: this.getImpactDamage(prop.weightClass),
                rotating: false,
                rotationSpeed: 0
            };
        }

        // Add to velocity (allows cumulative forces)
        prop.physicsData.velocityX += velocityX;
        prop.physicsData.velocityY += velocityY;

        // Add rotation for light props
        if (prop.weightClass === 'light') {
            prop.physicsData.rotating = true;
            prop.physicsData.rotationSpeed = (Math.random() - 0.5) * 0.2; // Random spin
        }

        // Add to moving props array if not already there
        if (!this.movingProps.includes(prop)) {
            this.movingProps.push(prop);
        }

        // Convert to dynamic physics body if needed
        this.convertToDynamic(prop);
    }

    /**
     * Check if a prop can move based on weight class and force source
     */
    canPropMove(prop, source) {
        if (!prop.sprite || !prop.sprite.body) {
            return false;
        }

        const weightClass = prop.weightClass;

        // Heavy props never move (unless destroyed by boss - Phase 6)
        if (weightClass === 'heavy') {
            return false;
        }

        // Light props move from any force
        if (weightClass === 'light') {
            return true;
        }

        // Medium props only move from explosions or boss attacks
        if (weightClass === 'medium') {
            return source === 'explosion' || source === 'boss';
        }

        return false;
    }

    /**
     * Get movement multiplier based on weight class
     */
    getMovementMultiplier(weightClass) {
        switch (weightClass) {
            case 'light':
                return 10.0; // ~150-200px becomes 5-10 world units/sec
            case 'medium':
                return 3.0;  // ~30-60px becomes 1.5-3 world units/sec
            case 'heavy':
                return 0.0; // Immovable
            default:
                return 5.0;
        }
    }

    /**
     * Get friction coefficient for prop
     */
    getFriction(prop) {
        // Check if prop has custom friction defined
        if (prop.friction !== undefined) {
            return prop.friction;
        }

        // Default friction based on weight
        switch (prop.weightClass) {
            case 'light':
                return 0.92; // Slides longer
            case 'medium':
                return 0.88; // Stops sooner
            default:
                return 0.95;
        }
    }

    /**
     * Get impact damage based on weight class
     */
    getImpactDamage(weightClass) {
        switch (weightClass) {
            case 'light':
                return 3 + Math.floor(Math.random() * 3); // 3-5 damage
            case 'medium':
                return 8 + Math.floor(Math.random() * 5); // 8-12 damage
            case 'heavy':
                return 0; // Heavy props don't move
            default:
                return 0;
        }
    }

    /**
     * Convert prop from static to dynamic physics body
     */
    convertToDynamic(prop) {
        // No longer needed - physics handled in world space
        // Keep method for backward compatibility
    }

    /**
     * Update all moving props
     * Called every frame by EnvironmentManager
     */
    update(delta) {
        // Process each moving prop
        for (let i = this.movingProps.length - 1; i >= 0; i--) {
            const prop = this.movingProps[i];

            if (!prop.isAlive() || !prop.physicsData) {
                // Remove from array
                this.movingProps.splice(i, 1);
                continue;
            }

            // Apply velocity to position
            this.updatePropMovement(prop, delta);

            // Apply friction
            this.applyFriction(prop);

            // Check for collisions
            this.checkCollisions(prop);

            // Check if stopped
            if (this.hasStopped(prop)) {
                this.stopProp(prop);
                this.movingProps.splice(i, 1);
            }
        }
    }

    /**
     * Update prop position based on velocity
     */
    updatePropMovement(prop, delta) {
        const physics = prop.physicsData;

        // NEW: Update world position directly
        const deltaSeconds = delta / 1000;
        prop.worldX += physics.velocityX * deltaSeconds;
        prop.worldY += physics.velocityY * deltaSeconds;

        // Convert to screen for sprite rendering
        const { screenX, screenY } = worldToScreen(prop.worldX, prop.worldY, prop.worldZ);
        prop.sprite.setPosition(screenX, screenY);

        // Update screen position tracking (for compatibility)
        prop.x = screenX;
        prop.y = screenY;

        // Update health bar position in world space
        if (prop.healthBarBg && prop.healthBarFill) {
            const healthBarOffset = 0.5; // World units above prop
            const pixelsPerWorldUnit = ISOMETRIC_CONFIG.PIXELS_PER_WORLD_UNIT || 50;
            const barWorldZ = prop.worldZ + prop.volumeHeight / pixelsPerWorldUnit + healthBarOffset;
            const barPos = worldToScreen(prop.worldX, prop.worldY, barWorldZ);

            prop.healthBarBg.setPosition(barPos.screenX, barPos.screenY);
            prop.healthBarFill.setPosition(barPos.screenX, barPos.screenY);

            // Update health bar depth
            prop.healthBarBg.setDepth(calculateDepth(prop.worldY, 1000));
            prop.healthBarFill.setDepth(calculateDepth(prop.worldY, 1001));

            const healthPercent = prop.getHealthPercent();
            prop.healthBarFill.scaleX = healthPercent;
        }

        // Apply rotation if enabled
        if (physics.rotating && prop.sprite) {
            prop.sprite.rotation += physics.rotationSpeed;
        }
    }

    /**
     * Apply friction to slow down prop
     */
    applyFriction(prop) {
        const physics = prop.physicsData;

        // Apply friction coefficient
        physics.velocityX *= physics.friction;
        physics.velocityY *= physics.friction;

        // Slow down rotation
        if (physics.rotating) {
            physics.rotationSpeed *= 0.95;
        }
    }

    /**
     * Check if prop has stopped moving
     */
    hasStopped(prop) {
        const physics = prop.physicsData;
        const speed = Math.sqrt(physics.velocityX ** 2 + physics.velocityY ** 2);

        // Stopped if speed is very low (world units/sec)
        return speed < 0.2; // Changed from 5 pixels to 0.2 world units
    }

    /**
     * Stop a prop and convert back to static
     */
    stopProp(prop) {
        // Clear physics data
        if (prop.physicsData) {
            prop.physicsData.velocityX = 0;
            prop.physicsData.velocityY = 0;
            prop.physicsData.rotating = false;
        }
    }

    /**
     * Check for collisions with other entities
     */
    checkCollisions(prop) {
        if (!prop.sprite || !prop.physicsData) return;

        const physics = prop.physicsData;
        const speed = Math.sqrt(physics.velocityX ** 2 + physics.velocityY ** 2);

        // Only deal damage if moving fast enough (world units/sec)
        if (speed < 2.0) {  // Changed from 50 pixels to 2 world units
            return;
        }

        // Check collision with players
        this.checkPlayerCollisions(prop);

        // Check collision with enemies
        this.checkEnemyCollisions(prop);

        // Check collision with other props (Phase 3 - prop-to-prop damage)
    }

    /**
     * Check and handle collisions with players
     */
    checkPlayerCollisions(prop) {
        if (!this.scene.playerManager) return;

        const players = this.scene.playerManager.getLivingPlayers();
        const physics = prop.physicsData;

        players.forEach(player => {
            // Distance check in WORLD space
            const dx = prop.worldX - player.worldX;
            const dy = prop.worldY - player.worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Collision radius check (in world units)
            const collisionRadius = Math.max(prop.volumeWidth, prop.volumeDepth) / 2 + 1;
            if (dist < collisionRadius) {
                // Deal impact damage
                player.takeDamage(physics.impactDamage);

                // Apply knockback to player (world-space angle)
                const angle = Math.atan2(
                    player.worldY - prop.worldY,
                    player.worldX - prop.worldX
                );
                const knockback = 100;
                player.applyKnockback(
                    Math.cos(angle) * knockback,
                    Math.sin(angle) * knockback
                );

                // Bounce prop back slightly
                physics.velocityX *= -0.3;
                physics.velocityY *= -0.3;

                // Visual feedback - flash prop
                this.flashProp(prop);
            }
        });
    }

    /**
     * Check and handle collisions with enemies
     */
    checkEnemyCollisions(prop) {
        if (!this.scene.enemies) return;

        const physics = prop.physicsData;

        this.scene.enemies.forEach(enemy => {
            if (!enemy.isAlive()) return;

            // Distance check in WORLD space
            const dx = prop.worldX - enemy.worldX;
            const dy = prop.worldY - enemy.worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Collision radius check (in world units)
            const collisionRadius = Math.max(prop.volumeWidth, prop.volumeDepth) / 2 + 1;
            if (dist < collisionRadius) {
                // Deal impact damage
                enemy.takeDamage(physics.impactDamage);

                // Bounce prop back
                physics.velocityX *= -0.4;
                physics.velocityY *= -0.4;

                // Visual feedback
                this.flashProp(prop);
            }
        });
    }

    /**
     * Flash prop white briefly on impact
     */
    flashProp(prop) {
        if (!prop.sprite) return;

        prop.sprite.setTint(0xFFFFFF);
        this.scene.time.delayedCall(100, () => {
            if (prop.sprite) {
                prop.sprite.clearTint();
            }
        });
    }

    /**
     * Apply explosion force to all props in radius
     * Called by explosion effects
     * @param {number} worldX - World X position of explosion center
     * @param {number} worldY - World Y position of explosion center
     * @param {number} radius - Explosion radius
     * @param {number} force - Force magnitude
     */
    applyExplosionForce(worldX, worldY, radius, force) {
        if (!this.scene.environmentManager) {
            return;
        }

        const props = this.scene.environmentManager.getPropsInRadius(worldX, worldY, radius);

        props.forEach(prop => {
            // Calculate direction from explosion center (in WORLD space)
            const dx = prop.worldX - worldX;
            const dy = prop.worldY - worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist === 0) return;

            // Normalize and apply force
            const forceX = (dx / dist) * force;
            const forceY = (dy / dist) * force;

            // Apply with distance falloff
            const falloff = 1 - (dist / radius);
            this.applyForce(
                prop,
                forceX * falloff,
                forceY * falloff,
                'explosion'
            );
        });
    }

    /**
     * Apply contact force (player/enemy bumping into props)
     * @param {EnvironmentProp} prop - The prop to apply force to
     * @param {number} sourceWorldX - World X position of source
     * @param {number} sourceWorldY - World Y position of source
     * @param {number} force - Force magnitude
     */
    applyContactForce(prop, sourceWorldX, sourceWorldY, force = 50) {
        // Calculate direction away from source (in WORLD space)
        const dx = prop.worldX - sourceWorldX;
        const dy = prop.worldY - sourceWorldY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return;

        const forceX = (dx / dist) * force;
        const forceY = (dy / dist) * force;

        this.applyForce(prop, forceX, forceY, 'contact');
    }

    /**
     * Get all currently moving props
     */
    getMovingProps() {
        return this.movingProps;
    }

    /**
     * Clear all moving props (wave reset)
     */
    clearAll() {
        this.movingProps.forEach(prop => {
            this.stopProp(prop);
        });
        this.movingProps = [];
    }
}
