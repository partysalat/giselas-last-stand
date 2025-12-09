import { worldToScreen, screenToWorld, worldDistance2D, calculateDepth } from '../utils/CoordinateTransform.js';
import { ISOMETRIC_CONFIG } from '../config.js';

export class Bullet {
    constructor(scene, worldX, worldY, worldZ, angle, damage = 10, velocityZ = 0, hasGravity = false) {
        this.scene = scene;

        // World space coordinates
        this.worldX = worldX;
        this.worldY = worldY;
        this.worldZ = worldZ;

        // World space velocity
        // When velocityZ is non-zero, scale horizontal velocity to maintain constant total speed
        const speed = ISOMETRIC_CONFIG.BULLET_SPEED;
        if (velocityZ !== 0) {
            // Calculate horizontal speed component for 3D trajectory
            const horizontalSpeedRatio = Math.sqrt(1 - Math.pow(velocityZ / speed, 2));
            this.velocityX = Math.cos(angle) * speed * horizontalSpeedRatio;
            this.velocityY = Math.sin(angle) * speed * horizontalSpeedRatio;
        } else {
            // 2D trajectory (ground level)
            this.velocityX = Math.cos(angle) * speed;
            this.velocityY = Math.sin(angle) * speed;
        }
        this.velocityZ = velocityZ;

        // Gravity flag
        this.hasGravity = hasGravity;

        // Convert to screen space for sprite
        const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ);

        // Use a small circle for bullet visual
        this.sprite = scene.add.circle(screenX, screenY, 4, 0xFFFF00); // Small yellow circle
        this.sprite.setStrokeStyle(1, 0xFF8800, 1); // Orange outline

        // NOTE: We don't use Arcade Physics for bullets anymore
        // Custom world-space physics is more accurate for isometric

        // Bullet properties
        this.damage = damage;
        this.alive = true;
        this.piercing = false;
        this.radius = 0.1; // Collision radius in world units (~5 pixels)

        // Visual properties - use dynamic depth sorting based on world Y position
        // Base depth 100 ensures bullets render above floor and props
        this.sprite.setDepth(calculateDepth(this.worldY, 100));

        // Note: Player bullets do not collide with ANY players (no friendly fire)
        // Collision checking is handled in GameScene.checkBulletCollisions()
        // which only checks bullets against enemies, not players
    }

    update(delta) {
        if (!delta || !this.alive) return;

        // Update world position
        const deltaSeconds = delta / 1000;

        // Apply gravity if enabled (use BULLET_GRAVITY if available, otherwise GRAVITY)
        if (this.hasGravity) {
            const gravity = ISOMETRIC_CONFIG.BULLET_GRAVITY || ISOMETRIC_CONFIG.GRAVITY;
            this.velocityZ += gravity * deltaSeconds;
        }

        this.worldX += this.velocityX * deltaSeconds;
        this.worldY += this.velocityY * deltaSeconds;
        this.worldZ += this.velocityZ * deltaSeconds;

        // Destroy if hits ground
        if (this.worldZ <= 0) {
            this.destroy();
            return;
        }

        // Convert to screen space and update sprite
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);
        this.sprite.setPosition(screenX, screenY);

        // Update depth for proper isometric sorting
        this.sprite.setDepth(calculateDepth(this.worldY, 100));

        // Destroy if off screen (check screen bounds)
        const bounds = this.scene.cameras.main.worldView;
        if (screenX < bounds.x - 50 ||
            screenX > bounds.right + 50 ||
            screenY < bounds.y - 50 ||
            screenY > bounds.bottom + 50) {
            this.destroy();
        }
    }

    getSprite() {
        return this.sprite;
    }

    getDamage() {
        return this.damage;
    }

    isAlive() {
        return this.alive;
    }

    isPiercing() {
        return this.piercing;
    }

    setPiercing(value) {
        this.piercing = value;
    }

    getWorldX() {
        return this.worldX;
    }

    getWorldY() {
        return this.worldY;
    }

    getWorldZ() {
        return this.worldZ;
    }

    getRadius() {
        return this.radius;
    }

    /**
     * Check collision with a prop considering height
     * @param {EnvironmentProp} prop - The prop to check
     * @returns {boolean} True if bullet hits prop
     */
    checkPropCollision(prop) {
        // Bullets pass over props if flying high enough
        if (this.worldZ > prop.volumeHeight) {
            return false; // Bullet flies over obstacle
        }

        // Check if bullet is within prop's footprint
        const dx = this.worldX - prop.worldX;
        const dy = this.worldY - prop.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Simple circle vs AABB approximation
        const propRadius = Math.max(prop.volumeWidth, prop.volumeDepth) / 2;

        return distance < (this.radius + propRadius);
    }

    /**
     * Check collision with an enemy considering height
     * @param {Enemy} enemy - The enemy to check
     * @returns {boolean} True if bullet hits enemy
     */
    checkEnemyCollision(enemy) {
        // Check if bullet is at enemy's height
        const enemyTop = enemy.worldZ + enemy.height;
        const inHeightRange = (this.worldZ >= enemy.worldZ && this.worldZ <= enemyTop);

        if (!inHeightRange) {
            return false; // Bullet passes over/under enemy
        }

        // Check 2D distance
        const distance = worldDistance2D(
            this.worldX,
            this.worldY,
            enemy.worldX,
            enemy.worldY
        );

        return distance < (this.radius + enemy.radius);
    }

    destroy() {
        this.alive = false;
        this.sprite.destroy();
    }
}
