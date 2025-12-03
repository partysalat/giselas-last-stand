/**
 * PhysicsManager
 * Handles physics-based movement and collisions for environment props
 * Manages weight classes, knockback, rolling/sliding, and impact damage
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
                return 1.5; // Pushed far (100-200px from explosions)
            case 'medium':
                return 0.6; // Slide 30-60px
            case 'heavy':
                return 0.0; // Immovable
            default:
                return 1.0;
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
        if (!prop.sprite || !prop.sprite.body) {
            return;
        }

        const body = prop.sprite.body;

        // Already dynamic, skip
        if (!body.immovable) {
            return;
        }

        try {
            // Destroy the static body and recreate as dynamic
            this.scene.physics.world.remove(body);
            this.scene.physics.add.existing(prop.sprite, false); // false = dynamic

            // Get new body reference
            const newBody = prop.sprite.body;

            if (!newBody) {
                return;
            }

            // Configure physics properties
            // Note: gravity is controlled by physics world, not individual bodies
            if (newBody.setBounce) {
                newBody.setBounce(0.3, 0.3); // Some bounce on collision
            }
            if (newBody.setDrag) {
                newBody.setDrag(200, 200); // Drag force (helps with stopping)
            }
            newBody.setSize(prop.width, prop.height);
            newBody.setOffset(-prop.width / 2, -prop.height / 2);
            newBody.immovable = false; // Use property instead of method
        } catch (error) {
            // Silently fail
        }
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

        // Apply velocity to sprite body
        if (prop.sprite && prop.sprite.body) {
            // Use velocity property directly for arcade physics
            prop.sprite.body.velocity.x = physics.velocityX;
            prop.sprite.body.velocity.y = physics.velocityY;
        }

        // Update prop position tracking
        prop.x = prop.sprite.x;
        prop.y = prop.sprite.y;

        // Update health bar position
        if (prop.healthBarBg && prop.healthBarFill) {
            const healthBarY = prop.y - prop.height / 2 - 10;
            prop.healthBarBg.y = healthBarY;
            prop.healthBarFill.y = healthBarY;

            const healthPercent = prop.getHealthPercent();
            prop.healthBarFill.x = prop.x - prop.width / 2 + (prop.width * healthPercent) / 2;
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

        // Stopped if speed is very low
        return speed < 5;
    }

    /**
     * Stop a prop and convert back to static
     */
    stopProp(prop) {
        if (!prop.sprite || !prop.sprite.body) return;

        // Set velocity to zero
        prop.sprite.body.velocity.x = 0;
        prop.sprite.body.velocity.y = 0;

        // Convert back to static (immovable)
        prop.sprite.body.immovable = true;

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

        // Only deal damage if moving fast enough
        if (speed < prop.impactSpeed || 50) {
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
            const dist = Phaser.Math.Distance.Between(
                prop.x,
                prop.y,
                player.getX(),
                player.getY()
            );

            // Collision radius check
            const collisionRadius = Math.max(prop.width, prop.height) / 2 + 20;
            if (dist < collisionRadius) {
                // Deal impact damage
                player.takeDamage(physics.impactDamage);

                // Apply knockback to player
                const angle = Math.atan2(
                    player.getY() - prop.y,
                    player.getX() - prop.x
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

            const enemySprite = enemy.getSprite();
            const dist = Phaser.Math.Distance.Between(
                prop.x,
                prop.y,
                enemySprite.x,
                enemySprite.y
            );

            // Collision radius check
            const collisionRadius = Math.max(prop.width, prop.height) / 2 + 20;
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
     */
    applyExplosionForce(x, y, radius, force) {
        if (!this.scene.environmentManager) {
            return;
        }

        const props = this.scene.environmentManager.getPropsInRadius(x, y, radius);

        props.forEach(prop => {
            // Calculate direction from explosion center
            const dx = prop.x - x;
            const dy = prop.y - y;
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
     */
    applyContactForce(prop, sourceX, sourceY, force = 50) {
        // Calculate direction away from source
        const dx = prop.x - sourceX;
        const dy = prop.y - sourceY;
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
