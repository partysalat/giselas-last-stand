import { screenToWorld, worldToScreen } from '../utils/CoordinateTransform.js';

export class Cover {
    constructor(scene, screenX, screenY, type) {
        this.scene = scene;
        this.type = type;  // 'table', 'bar', 'barrel', 'piano'
        this.alive = true;

        // Store screen coordinates for sprite positioning
        this.screenX = screenX;
        this.screenY = screenY;

        // Convert screen coordinates to world coordinates for collision detection
        const worldPos = screenToWorld(screenX, screenY, 0);
        this.worldX = worldPos.worldX;
        this.worldY = worldPos.worldY;
        this.worldZ = 0;

        // Config will be loaded from COVER_TYPES
        this.loadConfig();

        this.health = this.maxHealth;

        // Create visual representation
        this.createSprite();
    }

    loadConfig() {
        const config = COVER_TYPES[this.type];
        if (!config) {
            throw new Error(`Unknown cover type: ${this.type}`);
        }

        this.name = config.name;
        this.maxHealth = config.maxHealth;

        // Store screen pixel dimensions for sprite
        this.screenWidth = config.width;
        this.screenHeight = config.height;

        // Convert dimensions to world units for collision (50 pixels ≈ 1 world unit)
        this.worldWidth = config.width / 50;
        this.worldHeight = config.height / 50;

        this.color = config.color;
        this.explosive = config.explosive || false;

        // Convert explosion radius to world units
        this.explosionRadius = config.explosionRadius ? config.explosionRadius / 50 : 0;
        this.explosionDamage = config.explosionDamage || 0;
    }

    createSprite() {
        // Create rectangle sprite using screen coordinates
        this.sprite = this.scene.add.rectangle(
            this.screenX,
            this.screenY,
            this.screenWidth,
            this.screenHeight,
            this.color
        );
        this.sprite.setStrokeStyle(3, 0x000000);

        // Enable physics - static body that blocks movement
        this.scene.physics.add.existing(this.sprite, true); // true = static

        // Enable collision on the body
        this.sprite.body.setSize(this.screenWidth, this.screenHeight);
        this.sprite.body.setOffset(-this.screenWidth / 2, -this.screenHeight / 2)

        // Create health bar (initially hidden)
        this.healthBarBg = this.scene.add.rectangle(
            this.screenX,
            this.screenY - this.screenHeight / 2 - 10,
            this.screenWidth,
            4,
            0x000000,
            0.5
        );

        this.healthBarFill = this.scene.add.rectangle(
            this.screenX,
            this.screenY - this.screenHeight / 2 - 10,
            this.screenWidth,
            4,
            0x00ff00,
            0.8
        );

        // Hide health bar initially
        this.healthBarBg.setVisible(false);
        this.healthBarFill.setVisible(false);
    }

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
            this.updateVisualDamage();
        }
    }

    updateVisualDamage() {
        const healthPercent = this.health / this.maxHealth;

        // Update alpha
        if (healthPercent <= 0.25) {
            // Nearly destroyed - very transparent
            this.sprite.setAlpha(0.4);
        } else if (healthPercent <= 0.5) {
            // Heavily damaged - semi-transparent
            this.sprite.setAlpha(0.6);
        } else if (healthPercent <= 0.75) {
            // Moderately damaged - slight transparency
            this.sprite.setAlpha(0.8);
        } else {
            // Pristine
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

    destroy() {
        if (!this.alive) return;

        this.alive = false;

        // Create destruction particles
        this.createDestructionEffect();

        if (this.explosive) {
            this.explode();
        }

        // Destroy health bar
        if (this.healthBarBg) {
            this.healthBarBg.destroy();
            this.healthBarBg = null;
        }
        if (this.healthBarFill) {
            this.healthBarFill.destroy();
            this.healthBarFill = null;
        }

        // Destroy sprite after particles
        if (this.sprite) {
            this.scene.time.delayedCall(100, () => {
                if (this.sprite) {
                    this.sprite.destroy();
                    this.sprite = null;
                }
            });
        }
    }

    createDestructionEffect() {
        // Create 5-8 debris particles
        const numParticles = 5 + Math.floor(Math.random() * 4);

        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.5;
            const speed = 100 + Math.random() * 100;
            const size = 4 + Math.random() * 6;

            const particle = this.scene.add.circle(
                this.screenX,
                this.screenY,
                size,
                this.color,
                0.8
            );

            this.scene.tweens.add({
                targets: particle,
                x: this.screenX + Math.cos(angle) * speed,
                y: this.screenY + Math.sin(angle) * speed,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                onComplete: () => particle.destroy()
            });
        }
    }

    explode() {
        // Create explosion visual (use screen coordinates and convert radius to pixels)
        const explosionRadiusPixels = this.explosionRadius * 50;
        const explosion = this.scene.add.circle(
            this.screenX,
            this.screenY,
            explosionRadiusPixels,
            0xFF4500,
            0.6
        );

        // Explosion animation
        this.scene.tweens.add({
            targets: explosion,
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.8, to: 0 },
            duration: 400,
            onComplete: () => explosion.destroy()
        });

        // Damage after a tiny delay to allow this explosion to complete
        this.scene.time.delayedCall(50, () => {
            this.damageInRadius();
        });
    }

    damageInRadius() {
        // Damage all living players (use world coordinates)
        if (this.scene.playerManager) {
            this.scene.playerManager.getLivingPlayers().forEach(player => {
                const dx = player.worldX - this.worldX;
                const dy = player.worldY - this.worldY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.explosionRadius) {
                    player.takeDamage(this.explosionDamage);
                }
            });
        }

        // Damage enemies (use world coordinates)
        this.scene.enemies.forEach(enemy => {
            if (!enemy.isAlive()) return;

            const dx = enemy.worldX - this.worldX;
            const dy = enemy.worldY - this.worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.explosionRadius) {
                enemy.takeDamage(this.explosionDamage);
            }
        });

        // Damage other cover objects (use world coordinates)
        if (this.scene.coverManager) {
            this.scene.coverManager.damageInRadius(
                this.worldX,
                this.worldY,
                this.explosionRadius,
                this.explosionDamage,
                this // exclude self
            );
        }
    }

    checkBulletCollision(bulletWorldX, bulletWorldY) {
        if (!this.alive) return false;

        // Simple AABB collision check using world coordinates
        const halfWidth = this.worldWidth / 2;
        const halfHeight = this.worldHeight / 2;

        return (
            bulletWorldX >= this.worldX - halfWidth &&
            bulletWorldX <= this.worldX + halfWidth &&
            bulletWorldY >= this.worldY - halfHeight &&
            bulletWorldY <= this.worldY + halfHeight
        );
    }

    isAlive() {
        return this.alive;
    }

    getSprite() {
        return this.sprite;
    }

    getBounds() {
        return {
            worldX: this.worldX,
            worldY: this.worldY,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            screenX: this.screenX,
            screenY: this.screenY,
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight
        };
    }
}

// Cover type configurations
export const COVER_TYPES = {
    table: {
        name: 'Wooden Table',
        maxHealth: 100,
        width: 80,
        height: 40,
        color: 0x8B4513  // Brown
    },
    bar: {
        name: 'Bar Counter',
        maxHealth: 200,
        width: 120,
        height: 50,
        color: 0x654321  // Dark brown
    },
    barrel: {
        name: 'Barrel',
        maxHealth: 50,
        width: 40,
        height: 40,
        color: 0xA0522D,  // Sienna brown
        explosive: true,
        explosionRadius: 60,
        explosionDamage: 20
    },
    piano: {
        name: 'Piano',
        maxHealth: 150,
        width: 90,
        height: 60,
        color: 0x2F4F4F  // Dark slate gray
    }
};
