import { worldToScreen, screenToWorld, worldDistance2D } from '../utils/CoordinateTransform.js';
import { ISOMETRIC_CONFIG } from '../config.js';

export class Bullet {
    constructor(scene, worldX, worldY, worldZ, angle, damage = 10) {
        this.scene = scene;

        // World space coordinates
        this.worldX = worldX;
        this.worldY = worldY;
        this.worldZ = worldZ;

        // World space velocity
        const speed = 15; // World units per second
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
        this.velocityZ = 0; // Bullets travel horizontally (no vertical arc for now)

        // Convert to screen space for sprite
        const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ);
        this.sprite = scene.add.image(screenX, screenY, 'bullet');

        // NOTE: We don't use Arcade Physics for bullets anymore
        // Custom world-space physics is more accurate for isometric

        // Bullet properties
        this.damage = damage;
        this.alive = true;
        this.piercing = false;
        this.radius = 4; // Collision radius in world units

        // Visual properties
        this.sprite.setDepth(50); // Bullets render above most things

        // Note: Player bullets do not collide with ANY players (no friendly fire)
        // Collision checking is handled in GameScene.checkBulletCollisions()
        // which only checks bullets against enemies, not players
    }

    update(delta) {
        if (!delta || !this.alive) return;

        // Update world position
        const deltaSeconds = delta / 1000;
        this.worldX += this.velocityX * deltaSeconds;
        this.worldY += this.velocityY * deltaSeconds;
        this.worldZ += this.velocityZ * deltaSeconds;

        // Convert to screen space and update sprite
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);
        this.sprite.setPosition(screenX, screenY);

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
        // Handle enemies that haven't been converted to world space yet (Phase 5)
        if (enemy.worldX === undefined || enemy.worldY === undefined) {
            // Fallback to screen-space collision for legacy enemies
            const enemySprite = enemy.getSprite();
            const dx = this.worldX - enemySprite.x;
            const dy = this.worldY - enemySprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (this.radius + (enemy.radius || 15));
        }

        // World-space collision with height checking (for Phase 5+ enemies)
        const enemyHeight = enemy.height || 40; // Default height
        const enemyZ = enemy.worldZ || 0;
        const enemyTop = enemyZ + enemyHeight;
        const inHeightRange = (this.worldZ >= enemyZ && this.worldZ <= enemyTop);

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

        return distance < (this.radius + (enemy.radius || 15));
    }

    destroy() {
        this.alive = false;
        this.sprite.destroy();
    }
}
