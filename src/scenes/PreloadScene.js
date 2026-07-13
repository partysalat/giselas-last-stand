export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Add loading bar (optional but nice)
        this.createLoadingBar();

        // === PLAYER SPRITES ===

        const playerColors = ['red', 'blue', 'green', 'yellow'];
        const playerSheets = [
            { key: 'idle',          file: 'gisela_idle.png' },
            { key: 'idle-back',     file: 'gisela_back_idle_idle_back.png' },
            { key: 'run-back',      file: 'gisela_back_run_run_down.png' },
            { key: 'run-right',     file: 'gisela_front_run_run_right.png' },
            { key: 'attack-front',  file: 'gisela_attack.png' },
            { key: 'attack-back',   file: 'gisela_back_idle_attack_back.png' },
            { key: 'jump',          file: 'gisela_back_idle_jump_back.png' },
            { key: 'death',         file: 'gisela_death.png' },
        ];
        for (const color of playerColors) {
            for (const { key, file } of playerSheets) {
                this.load.spritesheet(`gisela-${color}-${key}`,
                    `assets/sprites/player/${color}/${file}`,
                    { frameWidth: 640, frameHeight: 640 }
                );
            }
        }

        // === ENEMY SPRITES ===

        // Load 8-directional sprites for Bandit Lobster
        this.load.image('bandit-lobster-down', 'assets/sprites/enemies/bandit-lobster/bandit-lobster-down.png');
        this.load.image('bandit-lobster-up', 'assets/sprites/enemies/bandit-lobster/bandit-lobster-top.png');
        this.load.image('bandit-lobster-left', 'assets/sprites/enemies/bandit-lobster/bandit-lobster-left.png');
        this.load.image('bandit-lobster-right', 'assets/sprites/enemies/bandit-lobster/bandit-lobster-right.png');
        this.load.image('bandit-lobster-down-left', 'assets/sprites/enemies/bandit-lobster/bandit-lobster-down-left.png');
        this.load.image('bandit-lobster-down-right', 'assets/sprites/enemies/bandit-lobster/bandit-lobster-down-right.png');
        this.load.image('bandit-lobster-up-left', 'assets/sprites/enemies/bandit-lobster/bandit-lobster-top-left.png');
        this.load.image('bandit-lobster-up-right', 'assets/sprites/enemies/bandit-lobster/bandit-lobster-top-right.png');

        // Load 8-directional sprites for Hermit Tank
        this.load.image('hermit-tank-down', 'assets/sprites/enemies/hermit-tank/hermit-tank-down.png');
        this.load.image('hermit-tank-up', 'assets/sprites/enemies/hermit-tank/hermit-tank-up.png');
        this.load.image('hermit-tank-left', 'assets/sprites/enemies/hermit-tank/hermit-tank-left.png');
        this.load.image('hermit-tank-right', 'assets/sprites/enemies/hermit-tank/hermit-tank-right.png');
        this.load.image('hermit-tank-down-left', 'assets/sprites/enemies/hermit-tank/hermit-tank-bottom-left.png');
        this.load.image('hermit-tank-down-right', 'assets/sprites/enemies/hermit-tank/hermit-tank-bottom-right.png');
        this.load.image('hermit-tank-up-left', 'assets/sprites/enemies/hermit-tank/hermit-tank-top-left.png');
        this.load.image('hermit-tank-up-right', 'assets/sprites/enemies/hermit-tank/hermit-tank-top-right.png');

        // Load 8-directional sprites for Shrimp
        this.load.image('shrimp-down', 'assets/sprites/enemies/shrimp/shrimp-down.png');
        this.load.image('shrimp-up', 'assets/sprites/enemies/shrimp/shrimp-top.png');
        this.load.image('shrimp-left', 'assets/sprites/enemies/shrimp/shrimp-left.png');
        this.load.image('shrimp-right', 'assets/sprites/enemies/shrimp/shrimp-right.png');
        this.load.image('shrimp-down-left', 'assets/sprites/enemies/shrimp/shrimp-down-left.png');
        this.load.image('shrimp-down-right', 'assets/sprites/enemies/shrimp/shrimp-down-right.png');
        this.load.image('shrimp-up-left', 'assets/sprites/enemies/shrimp/shrimp-top-left.png');
        this.load.image('shrimp-up-right', 'assets/sprites/enemies/shrimp/shrimp-top-right.png');

        // Load 8-directional sprites for Flying Fish
        this.load.image('flying-fish-down', 'assets/sprites/enemies/flying-fish/flying-fish-bottom.png');
        this.load.image('flying-fish-up', 'assets/sprites/enemies/flying-fish/flying-fish-top.png');
        this.load.image('flying-fish-left', 'assets/sprites/enemies/flying-fish/flying-fish-left.png');
        this.load.image('flying-fish-right', 'assets/sprites/enemies/flying-fish/flying-fish-right.png');
        this.load.image('flying-fish-down-left', 'assets/sprites/enemies/flying-fish/flying-fish-bottom-left.png');
        this.load.image('flying-fish-down-right', 'assets/sprites/enemies/flying-fish/flying-fish-bottom-right.png');
        this.load.image('flying-fish-up-left', 'assets/sprites/enemies/flying-fish/flying-fish-top-left.png');
        this.load.image('flying-fish-up-right', 'assets/sprites/enemies/flying-fish/flying-fish-top-right.png');

        // Load 8-directional sprites for Jellyfish
        this.load.image('jellyfish-down', 'assets/sprites/enemies/jellyfish/jellyfish-bottom.png');
        this.load.image('jellyfish-up', 'assets/sprites/enemies/jellyfish/jellyfish-top.png');
        this.load.image('jellyfish-left', 'assets/sprites/enemies/jellyfish/jellyfish-left.png');
        this.load.image('jellyfish-right', 'assets/sprites/enemies/jellyfish/jellyfish-right.png');
        this.load.image('jellyfish-down-left', 'assets/sprites/enemies/jellyfish/jellyfish-bottom-left.png');
        this.load.image('jellyfish-down-right', 'assets/sprites/enemies/jellyfish/jellyfish-bottom-right.png');
        this.load.image('jellyfish-up-left', 'assets/sprites/enemies/jellyfish/jellyfish-top-left.png');
        this.load.image('jellyfish-up-right', 'assets/sprites/enemies/jellyfish/jellyfish-top-right.png');

        this.load.spritesheet('lobster-bandit', 'assets/sprites/enemies/lobster-bandit-idle.png', {
            frameWidth: 64,
            frameHeight: 48
        });

        // Load Iron Shell boss sprite (4 directional views in 2x2 grid)
        this.load.spritesheet('iron-shell-boss', 'assets/sprites/enemies/iron-shell.png', {
            frameWidth: 128,
            frameHeight: 128
        });

        // Load Kraken boss sprite (4 directional views in 2x2 grid)
        this.load.spritesheet('kraken-boss', 'assets/sprites/enemies/kraken.png', {
            frameWidth: 128,
            frameHeight: 128
        });

        // Load Kraken tentacle/arm sprite (4 variations in 2x2 grid)
        this.load.spritesheet('kraken-tentacle', 'assets/sprites/enemies/kraken_arm.png', {
            frameWidth: 64,
            frameHeight: 64
        });

        // Load Leviathan boss sprite - Phase 1 (4 directional views in 2x2 grid)
        this.load.spritesheet('leviathan-boss', 'assets/sprites/enemies/leviathan.png', {
            frameWidth: 128,
            frameHeight: 128
        });

        // Load Leviathan boss sprite - Phase 2 evolved form (4 directional views in 2x2 grid)
        this.load.spritesheet('leviathan-evolved', 'assets/sprites/enemies/leviathan_evolved.png', {
            frameWidth: 128,
            frameHeight: 128
        });

        // === PROJECTILES ===

        this.load.image('bullet', 'assets/sprites/projectiles/bullet.png');

        // === POWERUPS (COCKTAILS) ===

        this.load.image('cocktail-margarita', 'assets/sprites/powerups/cocktail-margarita.png');
        this.load.image('cocktail-mojito', 'assets/sprites/powerups/cocktail-mojito.png');
        this.load.image('cocktail-oldfashioned', 'assets/sprites/powerups/cocktail-oldfashioned.png');
        this.load.image('cocktail-tequilasunrise', 'assets/sprites/powerups/cocktail-tequilasunrise.png');
        this.load.image('cocktail-whiskeysour', 'assets/sprites/powerups/cocktail-whiskeysour.png');
        this.load.image('cocktail-manhattan', 'assets/sprites/powerups/cocktail-manhattan.png');

        // === HEALTH POWERUPS ===

        this.load.image('health-kit', 'assets/sprites/powerups/health_kit.png');

        // === ENVIRONMENT ===

        this.load.image('environment', 'assets/sprites/environment/environment.png');

        // Load environment props sprite sheet - 3x3 grid of heavy cover furniture
        this.load.spritesheet('interior1', 'assets/sprites/environment/interior1.png', {
            frameWidth: 341,  // Each sprite in the 3x3 grid
            frameHeight: 341
        });

        // Load environment props sprite sheet - 3x3 grid of light furniture
        this.load.spritesheet('interior2', 'assets/sprites/environment/interior2.png', {
            frameWidth: 341,  // Each sprite in the 3x3 grid
            frameHeight: 341
        });

        // Load environment props sprite sheet - 3x3 grid of hazard props
        this.load.spritesheet('interior3', 'assets/sprites/environment/interior3.png', {
            frameWidth: 341,  // Each sprite in the 3x3 grid
            frameHeight: 341
        });

        // Load environment props sprite sheet - 3x3 grid of tactical props
        this.load.spritesheet('interior4', 'assets/sprites/environment/interior4.png', {
            frameWidth: 341,  // Each sprite in the 3x3 grid
            frameHeight: 341
        });

        // Load environment props sprite sheet - 3x3 grid of special props & structural
        this.load.spritesheet('interior5', 'assets/sprites/environment/interior5.png', {
            frameWidth: 341,  // Each sprite in the 3x3 grid
            frameHeight: 341
        });

        // Load environment props sprite sheet - 3x3 grid of debris & destruction effects
        this.load.spritesheet('interior6', 'assets/sprites/environment/interior6.png', {
            frameWidth: 341,  // Each sprite in the 3x3 grid
            frameHeight: 341
        });

        // Load decorative back wall image
        this.load.image('backwall', 'assets/sprites/environment/walls.png');

        // this.load.image('barrel', 'assets/sprites/environment/barrel.png');
        // this.load.image('saloon-doors', 'assets/sprites/environment/saloon-doors.png');

        // === UI ===

        // this.load.image('bounty-poster', 'assets/ui/bounty-poster.png');
    }

    generateIsometricFloorTile() {
        // Create a 64x32 diamond-shaped tile
        const graphics = this.add.graphics();

        // Draw diamond shape
        graphics.fillStyle(0x6B4423, 1); // Wood color
        graphics.beginPath();
        graphics.moveTo(32, 0);   // Top
        graphics.lineTo(64, 16);  // Right
        graphics.lineTo(32, 32);  // Bottom
        graphics.lineTo(0, 16);   // Left
        graphics.closePath();
        graphics.fillPath();

        // Add shading for depth
        graphics.fillStyle(0x5A3419, 1); // Darker shade
        graphics.beginPath();
        graphics.moveTo(32, 16);  // Center
        graphics.lineTo(64, 16);  // Right
        graphics.lineTo(32, 32);  // Bottom
        graphics.lineTo(0, 16);   // Left
        graphics.closePath();
        graphics.fillPath();

        // Generate texture from graphics
        graphics.generateTexture('iso-floor-tile', 64, 32);
        graphics.destroy();
    }

    create() {
        console.log('Assets loaded, creating animations...');

        // Generate procedural textures
        this.generateIsometricFloorTile();

        // === CREATE ANIMATIONS ===

        // Gisela player animations — one set per color
        const animDefs = [
            { key: 'idle',         end: 7,  repeat: -1 },
            { key: 'idle-back',    end: 7,  repeat: -1 },
            { key: 'run-back',     end: 9,  repeat: -1 },
            { key: 'run-right',    end: 9,  repeat: -1 },
            { key: 'attack-front', end: 7,  repeat: -1 },
            { key: 'attack-back',  end: 7,  repeat: -1 },
            { key: 'jump',         end: 7,  repeat: 0  },
            { key: 'death',        end: 11, repeat: 0  },
        ];
        const colors = ['red', 'blue', 'green', 'yellow'];
        for (const color of colors) {
            for (const { key, end, repeat } of animDefs) {
                this.anims.create({
                    key: `gisela-${color}-${key}`,
                    frames: this.anims.generateFrameNumbers(`gisela-${color}-${key}`, { start: 0, end }),
                    frameRate: 8,
                    repeat,
                });
            }
        }

        // Enemy animations
        this.createEnemyIdleAnimation('lobster-bandit', 2); // 2 frames

        console.log('Starting game...');
        this.scene.start('StartScene');
    }

    createLoadingBar() {
        const width = 400;
        const height = 30;
        const x = (this.cameras.main.width / 2) - (width / 2);
        const y = (this.cameras.main.height / 2) - (height / 2);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 0.8);
        bg.fillRect(x, y, width, height);

        // Progress bar
        const progressBar = this.add.graphics();

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(x, y, width * value, height);
        });

        // Loading text
        this.add.text(this.cameras.main.width / 2, y - 30, 'Loading Gisela\'s Last Stand...', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }

    createEnemyIdleAnimation(spriteKey, frameCount) {
        const endFrame = frameCount - 1;
        this.anims.create({
            key: `${spriteKey}-idle`,
            frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: endFrame }),
            frameRate: 6,
            repeat: -1
        });
    }
}
