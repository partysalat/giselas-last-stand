import { worldToScreen } from '../utils/CoordinateTransform.js';

/**
 * Debug visualization for coordinate system
 * Press 'I' to toggle debug visualization
 */
export class CoordinateDebug {
    constructor(scene) {
        this.scene = scene;
        this.enabled = false;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(10000); // Always on top

        // Add keyboard toggle
        scene.input.keyboard.on('keydown-I', () => {
            this.enabled = !this.enabled;
            console.log(`Coordinate Debug: ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
            if (!this.enabled) {
                this.graphics.clear();
            }
        });
    }

    update() {
        if (!this.enabled) return;

        this.graphics.clear();

        // Draw enemy collision boxes vs sprite positions
        if (this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                if (!enemy.isAlive()) return;

                // Draw collision position (world coords converted to screen)
                const { screenX: collisionScreenX, screenY: collisionScreenY } = worldToScreen(
                    enemy.worldX,
                    enemy.worldY,
                    enemy.worldZ
                );

                // Green circle = collision position
                this.graphics.lineStyle(2, 0x00ff00, 1);
                this.graphics.strokeCircle(collisionScreenX, collisionScreenY, enemy.radius);

                // Red circle = sprite render position
                this.graphics.lineStyle(2, 0xff0000, 1);
                this.graphics.strokeCircle(enemy.sprite.x, enemy.sprite.y, enemy.radius);

                // Draw line connecting them if different
                const dx = enemy.sprite.x - collisionScreenX;
                const dy = enemy.sprite.y - collisionScreenY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 1) {
                    this.graphics.lineStyle(1, 0xffff00, 0.5);
                    this.graphics.lineBetween(
                        collisionScreenX,
                        collisionScreenY,
                        enemy.sprite.x,
                        enemy.sprite.y
                    );
                }
            });
        }

        // Draw bullet collision boxes
        if (this.scene.playerManager) {
            this.scene.playerManager.players.forEach(player => {
                player.bullets.forEach(bullet => {
                    if (!bullet.isAlive()) return;

                    // Draw bullet collision position (world coords converted to screen)
                    const { screenX: bulletScreenX, screenY: bulletScreenY } = worldToScreen(
                        bullet.worldX,
                        bullet.worldY,
                        bullet.worldZ
                    );

                    // Cyan circle = bullet collision position
                    this.graphics.lineStyle(2, 0x00ffff, 1);
                    this.graphics.strokeCircle(bulletScreenX, bulletScreenY, bullet.radius);

                    // Magenta circle = bullet sprite position
                    this.graphics.lineStyle(2, 0xff00ff, 1);
                    this.graphics.strokeCircle(bullet.sprite.x, bullet.sprite.y, bullet.radius);
                });
            });
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}
