import { worldToScreen, calculateDepth } from '../utils/CoordinateTransform.js';

export class HealthPickup {
    constructor(scene, worldX, worldY, worldZ = 0) {
        this.scene = scene;

        // World space coordinates (PRIMARY)
        this.worldX = worldX;
        this.worldY = worldY;
        this.worldZ = worldZ;

        // Convert to screen space for sprite
        const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ);

        // Create visual using health kit sprite
        this.sprite = scene.add.image(screenX, screenY, 'health-kit');
        this.sprite.setScale(0.8);

        // Set depth for proper sorting
        this.sprite.setDepth(calculateDepth(this.worldY, 50));

        // NOTE: No Arcade Physics - use world-space collision detection instead

        // Healing amount
        this.healAmount = 25;
        this.alive = true;
        this.radius = 0.3; // Collision radius in world units

        // Floating animation - animate worldZ instead of screen Y
        this.floatTime = 0;
        this.floatSpeed = 2; // Hz
        this.floatAmplitude = 0.2; // World units

        console.log('Health pickup created at world:', worldX, worldY, worldZ);
    }

    update(delta) {
        if (!this.alive) return;

        // Update floating animation
        this.floatTime += delta / 1000;
        this.worldZ = Math.sin(this.floatTime * Math.PI * 2 * this.floatSpeed) * this.floatAmplitude;

        // Update screen position
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);
        this.sprite.setPosition(screenX, screenY);

        // Update depth every frame
        this.sprite.setDepth(calculateDepth(this.worldY, 50));

        // Pulse scale animation
        const scale = 0.8 + Math.sin(this.floatTime * Math.PI * 4) * 0.1;
        this.sprite.setScale(scale);
    }

    getSprite() {
        return this.sprite;
    }

    getHealAmount() {
        return this.healAmount;
    }

    isAlive() {
        return this.alive;
    }

    collect() {
        this.alive = false;
        this.sprite.destroy();
        console.log('Health pickup collected');
    }
}
