import { worldToScreen, TILE_WIDTH, TILE_HEIGHT } from './CoordinateTransform.js';

/**
 * Debug visualization for isometric coordinate system
 * Draws world grid, coordinate axes, and entity positions
 */
export class CoordinateDebug {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(1000); // Always on top
        this.enabled = false;

        // Debug text display
        this.debugText = scene.add.text(10, 10, '', {
            font: '14px monospace',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 10 }
        });
        this.debugText.setDepth(1001);
        this.debugText.setScrollFactor(0); // Stay fixed to camera
    }

    /**
     * Toggle debug visualization on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.graphics.clear();
            this.debugText.setText('');
        }
    }

    /**
     * Draw isometric grid
     * @param {number} gridSize - Number of tiles in each direction
     * @param {number} centerWorldX - Center of grid in world space
     * @param {number} centerWorldY - Center of grid in world space
     */
    drawGrid(gridSize = 20, centerWorldX = 0, centerWorldY = 0) {
        if (!this.enabled) return;

        this.graphics.clear();
        this.graphics.lineStyle(1, 0x00ff00, 0.3);

        const halfGrid = gridSize / 2;

        // Draw grid lines
        for (let y = -halfGrid; y <= halfGrid; y++) {
            for (let x = -halfGrid; x <= halfGrid; x++) {
                const worldX = centerWorldX + x;
                const worldY = centerWorldY + y;

                // Draw tile diamond
                const points = this.getTileDiamond(worldX, worldY);
                this.graphics.strokePoints(points, true);
            }
        }

        // Draw axes
        this.graphics.lineStyle(2, 0xff0000, 0.8); // X axis = red
        const xAxis = worldToScreen(10, 0, 0);
        const xOrigin = worldToScreen(0, 0, 0);
        this.graphics.lineBetween(xOrigin.screenX, xOrigin.screenY, xAxis.screenX, xAxis.screenY);

        this.graphics.lineStyle(2, 0x0000ff, 0.8); // Y axis = blue
        const yAxis = worldToScreen(0, 10, 0);
        this.graphics.lineBetween(xOrigin.screenX, xOrigin.screenY, yAxis.screenX, yAxis.screenY);

        this.graphics.lineStyle(2, 0x00ff00, 0.8); // Z axis = green
        const zAxis = worldToScreen(0, 0, 10);
        this.graphics.lineBetween(xOrigin.screenX, xOrigin.screenY, zAxis.screenX, zAxis.screenY);
    }

    /**
     * Get diamond-shaped points for a tile
     */
    getTileDiamond(worldX, worldY) {
        const tl = worldToScreen(worldX, worldY, 0);
        const tr = worldToScreen(worldX + 1, worldY, 0);
        const br = worldToScreen(worldX + 1, worldY + 1, 0);
        const bl = worldToScreen(worldX, worldY + 1, 0);

        return [
            tl.screenX, tl.screenY,
            tr.screenX, tr.screenY,
            br.screenX, br.screenY,
            bl.screenX, bl.screenY
        ];
    }

    /**
     * Draw entity position marker
     */
    drawEntity(worldX, worldY, worldZ, color = 0xff00ff, label = '') {
        if (!this.enabled) return;

        const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ);

        // Draw position marker
        this.graphics.lineStyle(2, color, 1.0);
        this.graphics.strokeCircle(screenX, screenY, 5);

        // Draw height indicator
        if (worldZ > 0) {
            const ground = worldToScreen(worldX, worldY, 0);
            this.graphics.lineStyle(1, color, 0.5);
            this.graphics.lineBetween(screenX, screenY, ground.screenX, ground.screenY);
        }

        // Draw label
        if (label) {
            const text = this.scene.add.text(screenX + 8, screenY - 8, label, {
                font: '10px monospace',
                fill: '#ffffff'
            });
            text.setDepth(1002);
        }
    }

    /**
     * Update debug text with entity info
     */
    updateText(entities = []) {
        if (!this.enabled) return;

        let text = 'ISOMETRIC DEBUG MODE\n';
        text += '====================\n\n';

        entities.forEach(entity => {
            text += `${entity.label}:\n`;
            text += `  World: (${entity.worldX.toFixed(1)}, ${entity.worldY.toFixed(1)}, ${entity.worldZ.toFixed(1)})\n`;
            text += `  Screen: (${entity.screenX.toFixed(0)}, ${entity.screenY.toFixed(0)})\n\n`;
        });

        this.debugText.setText(text);
    }

    /**
     * Clean up debug graphics
     */
    destroy() {
        this.graphics.destroy();
        this.debugText.destroy();
    }
}
