/**
 * Base class for all environment props
 * Provides core functionality for destructible objects in the saloon
 */
export class EnvironmentProp {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.type = type;
        this.alive = true;
        this.x = x;
        this.y = y;

        // Load configuration from PROP_TYPES
        this.loadConfig();

        // Initialize health
        this.health = this.maxHealth;

        // Create visual representation
        this.createSprite();

        // Setup physics body
        this.setupPhysics();
    }

    /**
     * Load prop configuration from PROP_TYPES
     */
    loadConfig() {
        const config = PROP_TYPES[this.type];
        if (!config) {
            throw new Error(`Unknown prop type: ${this.type}`);
        }

        // Basic properties
        this.name = config.name;
        this.className = config.class;
        this.maxHealth = config.maxHealth;
        this.width = config.width;
        this.height = config.height;
        this.weightClass = config.weightClass;
        this.color = config.color;
        this.blocksBullets = config.blocksBullets !== undefined ? config.blocksBullets : true;
        this.layer = config.layer || 'ground';

        // Special properties
        this.onDestroy = config.onDestroy || null;

        // Hazard properties
        this.fireRadius = config.fireRadius || 0;
        this.fireDuration = config.fireDuration || 0;
        this.fireDamage = config.fireDamage || 0;
        this.explosionRadius = config.explosionRadius || 0;
        this.explosionDamage = config.explosionDamage || 0;

        // Physics properties (Phase 2)
        this.impactDamage = config.impactDamage || 0;
        this.impactSpeed = config.impactSpeed || 50; // Minimum speed to deal damage
        this.friction = config.friction || 0.92;
    }

    /**
     * Create the visual sprite representation
     */
    createSprite() {
        // Create rectangle sprite
        this.sprite = this.scene.add.rectangle(
            this.x,
            this.y,
            this.width,
            this.height,
            this.color
        );

        // Explosive barrels get red border for visibility
        if (this.explosionRadius > 0) {
            this.sprite.setStrokeStyle(5, 0xFF0000); // Thick red border
        } else {
            this.sprite.setStrokeStyle(3, 0x000000);
        }

        // Set depth based on layer
        const depthMap = {
            'ground': 5,
            'table': 6,
            'ceiling': 35,
            'wall': 4
        };
        this.sprite.setDepth(depthMap[this.layer] || 5);

        // Create health bar (initially hidden)
        this.createHealthBar();
    }

    /**
     * Create health bar UI elements
     */
    createHealthBar() {
        this.healthBarBg = this.scene.add.rectangle(
            this.x,
            this.y - this.height / 2 - 10,
            this.width,
            4,
            0x000000,
            0.5
        );
        this.healthBarBg.setDepth(100);

        this.healthBarFill = this.scene.add.rectangle(
            this.x,
            this.y - this.height / 2 - 10,
            this.width,
            4,
            0x00ff00,
            0.8
        );
        this.healthBarFill.setDepth(100);

        // Hide health bar initially
        this.healthBarBg.setVisible(false);
        this.healthBarFill.setVisible(false);
    }

    /**
     * Setup physics body
     */
    setupPhysics() {
        // Don't create physics body for explosive props - they need to be selectable/targetable
        // Explosive props should not block movement
        if (this.explosionRadius > 0 || this.className === 'HazardProp') {
            // No physics body for hazard props
            return;
        }

        // Phase 1: ALL props are static (immovable)
        // Phase 2 will implement dynamic physics for light/medium props
        this.scene.physics.add.existing(this.sprite, true); // true = static

        // Configure collision body
        this.sprite.body.setSize(this.width, this.height);
        this.sprite.body.setOffset(-this.width / 2, -this.height / 2);
    }

    /**
     * Handle damage taken by the prop
     */
    takeDamage(amount) {
        if (!this.alive) return;

        this.health -= amount;

        // Show health bar when first damaged
        if (this.healthBarBg && this.healthBarFill) {
            this.healthBarBg.setVisible(true);
            this.healthBarFill.setVisible(true);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
        } else {
            this.updateVisuals();
        }
    }

    /**
     * Update visual appearance based on damage state
     */
    updateVisuals() {
        const healthPercent = this.health / this.maxHealth;

        // Multi-stage visual degradation
        if (healthPercent <= 0.33) {
            // Breaking stage - very transparent
            this.sprite.setAlpha(0.4);
        } else if (healthPercent <= 0.66) {
            // Damaged stage - semi-transparent
            this.sprite.setAlpha(0.7);
        } else {
            // Pristine stage - full opacity
            this.sprite.setAlpha(1.0);
        }

        // Update health bar
        if (this.healthBarFill) {
            this.healthBarFill.width = this.width * healthPercent;
            this.healthBarFill.x = this.x - this.width / 2 + (this.width * healthPercent) / 2;

            // Color transition: green -> yellow -> red
            if (healthPercent > 0.5) {
                this.healthBarFill.setFillStyle(0x00ff00, 0.8); // Green
            } else if (healthPercent > 0.25) {
                this.healthBarFill.setFillStyle(0xffff00, 0.8); // Yellow
            } else {
                this.healthBarFill.setFillStyle(0xff0000, 0.8); // Red
            }
        }
    }

    /**
     * Destroy the prop and trigger effects
     */
    destroy() {
        if (!this.alive) return;

        this.alive = false;

        // Create destruction particles
        this.createDestructionEffect();

        // Trigger special destruction effects based on prop type
        // Check for explosionRadius OR onDestroy flag
        if (this.onDestroy || this.explosionRadius > 0) {
            this.triggerDestructionEffect();
        }

        // Clean up health bar
        if (this.healthBarBg) {
            this.healthBarBg.destroy();
            this.healthBarBg = null;
        }
        if (this.healthBarFill) {
            this.healthBarFill.destroy();
            this.healthBarFill = null;
        }

        // Destroy sprite after a brief delay for particles
        if (this.sprite) {
            this.scene.time.delayedCall(100, () => {
                if (this.sprite) {
                    this.sprite.destroy();
                    this.sprite = null;
                }
            });
        }
    }

    /**
     * Create particle effect on destruction
     */
    createDestructionEffect() {
        const numParticles = 5 + Math.floor(Math.random() * 4);

        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.5;
            const speed = 100 + Math.random() * 100;
            const size = 4 + Math.random() * 6;

            const particle = this.scene.add.circle(
                this.x,
                this.y,
                size,
                this.color,
                0.8
            );
            particle.setDepth(25);

            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Trigger special destruction effects (fire, explosion, etc.)
     */
    triggerDestructionEffect() {
        // This will be extended in Phase 3 for hazard props
        // For now, handle basic explosion if configured
        if (this.explosionRadius > 0) {
            this.explode();
        }
    }

    /**
     * Create explosion effect and damage
     */
    explode() {
        // Visual explosion effect
        const explosion = this.scene.add.circle(
            this.x,
            this.y,
            this.explosionRadius,
            0xFF4500,
            0.6
        );
        explosion.setDepth(25);

        // DEBUG: Show physics force radius (slightly larger, blue outline)
        const forceRadius = this.scene.add.circle(
            this.x,
            this.y,
            this.explosionRadius,
            0x0000FF,
            0
        );
        forceRadius.setStrokeStyle(3, 0x00FFFF);
        forceRadius.setDepth(25);

        this.scene.tweens.add({
            targets: [explosion, forceRadius],
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.8, to: 0 },
            duration: 400,
            onComplete: () => {
                explosion.destroy();
                forceRadius.destroy();
            }
        });

        // Damage entities in radius
        this.scene.time.delayedCall(50, () => {
            this.damageInRadius(this.x, this.y, this.explosionRadius, this.explosionDamage);
        });

        // Phase 2: Apply explosion force to nearby props
        if (this.scene.environmentManager && this.scene.environmentManager.physicsManager) {
            this.scene.environmentManager.physicsManager.applyExplosionForce(
                this.x,
                this.y,
                this.explosionRadius,
                600 // Force magnitude (increased for better visibility)
            );
        }
    }

    /**
     * Damage all entities in radius
     */
    damageInRadius(x, y, radius, damage) {
        // Damage players
        if (this.scene.playerManager) {
            this.scene.playerManager.getLivingPlayers().forEach(player => {
                const dx = player.getX() - x;
                const dy = player.getY() - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    player.takeDamage(damage);
                }
            });
        }

        // Damage enemies
        if (this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                if (!enemy.isAlive()) return;

                const dx = enemy.getSprite().x - x;
                const dy = enemy.getSprite().y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    enemy.takeDamage(damage);
                }
            });
        }

        // Damage other props via environment manager
        if (this.scene.environmentManager) {
            this.scene.environmentManager.damagePropsInRadius(x, y, radius, damage, this);
        }
    }

    /**
     * Check if bullet collides with this prop
     */
    checkBulletCollision(bulletX, bulletY) {
        if (!this.alive || !this.blocksBullets) return false;

        // AABB collision check
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        return (
            bulletX >= this.x - halfWidth &&
            bulletX <= this.x + halfWidth &&
            bulletY >= this.y - halfHeight &&
            bulletY <= this.y + halfHeight
        );
    }

    /**
     * Per-frame update (override in subclasses if needed)
     */
    update(delta) {
        // Base class has no per-frame logic
        // Subclasses can override for dynamic behavior
    }

    /**
     * Accessors
     */
    isAlive() {
        return this.alive;
    }

    getSprite() {
        return this.sprite;
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    getHealthPercent() {
        return this.health / this.maxHealth;
    }
}

/**
 * Prop type configurations
 * Phase 1: Basic 5 prop types
 */
export const PROP_TYPES = {
    // Heavy Cover
    barCounter: {
        name: 'Bar Counter',
        class: 'DestructibleCover',
        maxHealth: 200,
        width: 120,
        height: 50,
        weightClass: 'heavy',
        color: 0x654321,
        blocksBullets: true,
        layer: 'ground'
    },

    // Light Cover
    cardTable: {
        name: 'Card Table',
        class: 'DestructibleCover',
        maxHealth: 60,
        width: 60,
        height: 40,
        weightClass: 'light',
        color: 0x006400,
        blocksBullets: true,
        layer: 'ground'
    },

    woodenChair: {
        name: 'Wooden Chair',
        class: 'PhysicsProp',
        maxHealth: 30,
        width: 30,
        height: 30,
        weightClass: 'light',
        color: 0x8B4513,
        blocksBullets: true,
        impactDamage: 5,
        impactSpeed: 100,
        friction: 0.92,
        layer: 'ground'
    },

    barrel: {
        name: 'Barrel',
        class: 'PhysicsProp',
        maxHealth: 50,
        width: 40,
        height: 40,
        weightClass: 'medium',
        color: 0xA0522D,
        blocksBullets: true,
        impactDamage: 10,
        impactSpeed: 80,
        friction: 0.88,
        layer: 'ground'
    },

    // Hazard Prop
    oilLamp: {
        name: 'Oil Lamp',
        class: 'HazardProp',
        maxHealth: 20,
        width: 15,
        height: 15,
        weightClass: 'light',
        color: 0xFFD700,
        blocksBullets: false,
        onDestroy: 'createFireZone',
        fireRadius: 40,
        fireDuration: 8000,
        fireDamage: 5,
        layer: 'table'
    },

    // Legacy explosive barrel for compatibility
    explosiveBarrel: {
        name: 'Explosive Barrel',
        class: 'HazardProp',
        maxHealth: 50,
        width: 40,
        height: 40,
        weightClass: 'medium',
        color: 0x8B4513,
        blocksBullets: true,
        explosionRadius: 200, // Increased from 60 for better physics visibility
        explosionDamage: 20,
        layer: 'ground'
    }
};
