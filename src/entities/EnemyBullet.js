/**
 * EnemyBullet.js
 * Projectile fired by enemies (Shrimp and Lobsters)
 * Note: Enemy bullets CAN and SHOULD hit all players
 * Collision checking is handled in GameScene.updateEnemyBullets()
 */

import { worldToScreen, calculateDepth } from '../utils/CoordinateTransform.js';

export class EnemyBullet {
    constructor(scene, worldX, worldY, targetWorldX, targetWorldY, damage, bulletType = 'normal') {
        this.scene = scene;
        this.damage = damage;
        this.bulletType = bulletType;  // 'normal', 'heavy', 'burst', 'explosive', 'bubble'
        this.alive = true;

        // Store world coordinates
        this.worldX = worldX;
        this.worldY = worldY;
        this.worldZ = 0; // Bullets travel at ground level

        // Set speed based on bullet type (world units per second)
        if (bulletType === 'heavy') {
            this.speed = 5;  // World units per second
        } else if (bulletType === 'bubble') {
            this.speed = 6;  // Boss bubble bullets
        } else {
            this.speed = 8;  // World units per second
        }

        // Calculate direction with inaccuracy
        const dx = targetWorldX - worldX;
        const dy = targetWorldY - worldY;

        // Add spread/inaccuracy (bubbles have no inaccuracy)
        const inaccuracy = bulletType === 'heavy' ? 0.05 : (bulletType === 'bubble' ? 0 : 0.1);  // radians
        const baseAngle = Math.atan2(dy, dx);
        const finalAngle = baseAngle + (Math.random() - 0.5) * inaccuracy;

        this.velocityX = Math.cos(finalAngle) * this.speed;
        this.velocityY = Math.sin(finalAngle) * this.speed;
        this.angle = finalAngle;

        // Convert to screen space for sprite
        const { screenX, screenY } = worldToScreen(worldX, worldY, this.worldZ);

        // Create Phaser sprite with type-specific visuals
        let size, color;
        if (bulletType === 'heavy') {
            size = 12;
            color = 0xFF4500;
        } else if (bulletType === 'bubble') {
            size = 14;  // Larger than normal
            color = 0x00BFFF;  // Blue-tinted
        } else {
            size = 8;
            color = 0xFFD700;
        }

        this.sprite = scene.add.circle(screenX, screenY, size / 2, color);

        // Set depth to render above floor and most entities
        this.sprite.setDepth(100);

        // Bubble bullets have a special visual style
        if (bulletType === 'bubble') {
            this.sprite.setStrokeStyle(2, 0x87CEEB, 0.8);
            this.sprite.setAlpha(0.8);
        } else {
            this.sprite.setStrokeStyle(2, 0x000000, 0.5);
        }

        // Add glow effect
        this.sprite.setBlendMode(Phaser.BlendModes.ADD);

        // Lifetime limit (remove if goes off-screen)
        this.maxLifetime = 5000;  // 5 seconds
        this.spawnTime = Date.now();
    }

    update(deltaTime) {
        if (!this.alive) return;

        // Update world position
        const dt = deltaTime / 1000;  // Convert to seconds
        this.worldX += this.velocityX * dt;
        this.worldY += this.velocityY * dt;

        // Convert to screen space and update sprite
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);
        this.sprite.setPosition(screenX, screenY);

        // Update depth for proper isometric sorting
        this.sprite.setDepth(calculateDepth(this.worldY, 100));

        // Check bounds (use camera dimensions instead of hardcoded values)
        const margin = 50;
        const camera = this.scene.cameras.main;
        if (screenX < camera.worldView.x - margin ||
            screenX > camera.worldView.right + margin ||
            screenY < camera.worldView.y - margin ||
            screenY > camera.worldView.bottom + margin) {
            this.destroy();
            return;
        }

        // Check lifetime
        if (Date.now() - this.spawnTime > this.maxLifetime) {
            this.destroy();
            return;
        }
    }

    checkCollision(targetWorldX, targetWorldY, targetRadius) {
        // Use world coordinates for collision detection
        const dx = this.worldX - targetWorldX;
        const dy = this.worldY - targetWorldY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Bullet radius in world units
        let bulletRadius;
        if (this.bulletType === 'heavy') {
            bulletRadius = 0.12;  // ~6 pixels in world units
        } else if (this.bulletType === 'bubble') {
            bulletRadius = 0.14;  // ~7 pixels in world units
        } else {
            bulletRadius = 0.08;  // ~4 pixels in world units
        }

        return distance < (bulletRadius + targetRadius);
    }

    getDamage() {
        return this.damage;
    }

    explode() {
        if (this.bulletType === 'explosive') {
            // Create explosion visual at sprite position (screen space)
            const explosion = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                30,
                0xFF4500,
                0.6
            );
            explosion.setBlendMode(Phaser.BlendModes.ADD);

            // Animate explosion
            this.scene.tweens.add({
                targets: explosion,
                scale: { from: 0.5, to: 2 },
                alpha: { from: 0.8, to: 0 },
                duration: 400,
                onComplete: () => explosion.destroy()
            });

            // Return explosion data for AoE damage (in world coordinates)
            return {
                worldX: this.worldX,
                worldY: this.worldY,
                radius: 0.6,  // World units (~30 pixels)
                damage: this.damage * 0.5
            };
        }

        return null;
    }

    destroy() {
        this.alive = false;

        if (this.sprite) {
            this.sprite.destroy();
        }
    }

    isActive() {
        return this.alive;
    }

    getSprite() {
        return this.sprite;
    }
}
