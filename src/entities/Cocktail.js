import { worldToScreen, calculateDepth } from '../utils/CoordinateTransform.js';

// Cocktail buff configurations
export const COCKTAIL_TYPES = {
    margarita: {
        name: 'Margarita',
        color: 0x00ff00,
        sprite: 'cocktail-margarita',
        duration: 15000,
        effect: 'spread_shot',
        description: 'Spread Shot - bullets fan out'
    },
    mojito: {
        name: 'Mojito',
        color: 0x0088ff,
        sprite: 'cocktail-mojito',
        duration: 15000,
        effect: 'rapid_fire',
        description: 'Rapid Fire - 2x fire rate'
    },
    old_fashioned: {
        name: 'Old Fashioned',
        color: 0xff8800,
        sprite: 'cocktail-oldfashioned',
        duration: 15000,
        effect: 'heavy_hitter',
        description: 'Heavy Hitter - 2x damage'
    },
    tequila_sunrise: {
        name: 'Tequila Sunrise',
        color: 0xffff00,
        sprite: 'cocktail-tequilasunrise',
        duration: 20000,
        effect: 'damage_ramp',
        description: 'Damage Ramp - damage increases'
    },
    whiskey_sour: {
        name: 'Whiskey Sour',
        color: 0xffdd00,
        sprite: 'cocktail-whiskeysour',
        duration: 15000,
        effect: 'piercing',
        description: 'Piercing - bullets pass through'
    },
    manhattan: {
        name: 'Manhattan',
        color: 0xff0000,
        sprite: 'cocktail-manhattan',
        duration: 15000,
        effect: 'critical',
        description: 'Critical Hits - 50% chance 3x damage'
    }
};

export class Cocktail {
    constructor(scene, worldX, worldY, worldZ = 0, type) {
        this.scene = scene;
        this.type = type;
        this.config = COCKTAIL_TYPES[type];
        this.alive = true;

        // World space coordinates (PRIMARY)
        this.worldX = worldX;
        this.worldY = worldY;
        this.worldZ = worldZ;

        // Convert to screen space for sprite
        const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ);

        // Create visual representation using sprite image
        this.sprite = scene.add.image(screenX, screenY, this.config.sprite);
        this.sprite.setScale(1.2); // Scale up for better visibility
        this.sprite.setDepth(calculateDepth(this.worldY, 1000)); // Use proper depth sorting

        // Add glow effect (scaled to collision radius)
        const glowRadiusPixels = this.config.radius * 50 * 1.5;  // 1.5x collision radius
        this.glow = scene.add.circle(screenX, screenY, glowRadiusPixels, this.config.color, 0.3);
        this.glow.setDepth(calculateDepth(this.worldY, 999)); // Glow just below sprite

        // Collision radius (defined in config)
        this.radius = this.config.radius; // World units (typically 0.3)

        // Floating animation - animate worldZ instead of screen Y
        this.floatTime = 0;
        this.floatSpeed = 1.5; // Hz
        this.floatAmplitude = 0.2; // World units

        console.log('Cocktail created:', this.config.name, 'at world:', worldX, worldY, worldZ);
    }

    update(delta) {
        if (!this.alive) return;

        // Update floating animation
        this.floatTime += delta / 1000;
        this.worldZ = Math.sin(this.floatTime * Math.PI * 2 * this.floatSpeed) * this.floatAmplitude;

        // Update screen position
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);
        this.sprite.setPosition(screenX, screenY);
        this.glow.setPosition(screenX, screenY);

        // Update depth every frame
        this.sprite.setDepth(calculateDepth(this.worldY, 1000));
        this.glow.setDepth(calculateDepth(this.worldY, 999));

        // Pulse glow alpha
        const glowAlpha = 0.3 + Math.sin(this.floatTime * Math.PI * 4) * 0.1;
        this.glow.setAlpha(glowAlpha);
    }

    getSprite() {
        return this.sprite;
    }

    getType() {
        return this.type;
    }

    getConfig() {
        return this.config;
    }

    isAlive() {
        return this.alive;
    }

    collect() {
        this.alive = false;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.glow) this.glow.destroy();
    }
}
