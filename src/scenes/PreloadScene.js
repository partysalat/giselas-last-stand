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

        // Load 8-directional sprites for Velociraptor
        this.load.image('velociraptor-down', 'assets/sprites/enemies/velociraptor/velociraptor-down.png');
        this.load.image('velociraptor-up', 'assets/sprites/enemies/velociraptor/velociraptor-top.png');
        this.load.image('velociraptor-left', 'assets/sprites/enemies/velociraptor/velociraptor-left.png');
        this.load.image('velociraptor-right', 'assets/sprites/enemies/velociraptor/velociraptor-right.png');
        this.load.image('velociraptor-down-left', 'assets/sprites/enemies/velociraptor/velociraptor-down-left.png');
        this.load.image('velociraptor-down-right', 'assets/sprites/enemies/velociraptor/velociraptor-down-right.png');
        this.load.image('velociraptor-up-left', 'assets/sprites/enemies/velociraptor/velociraptor-top-left.png');
        this.load.image('velociraptor-up-right', 'assets/sprites/enemies/velociraptor/velociraptor-top-right.png');

        // Load 8-directional sprites for Ankylosaurus Tank
        this.load.image('ankylosaurus-down', 'assets/sprites/enemies/ankylosaurus/ankylosaurus-down.png');
        this.load.image('ankylosaurus-up', 'assets/sprites/enemies/ankylosaurus/ankylosaurus-up.png');
        this.load.image('ankylosaurus-left', 'assets/sprites/enemies/ankylosaurus/ankylosaurus-left.png');
        this.load.image('ankylosaurus-right', 'assets/sprites/enemies/ankylosaurus/ankylosaurus-right.png');
        this.load.image('ankylosaurus-down-left', 'assets/sprites/enemies/ankylosaurus/ankylosaurus-bottom-left.png');
        this.load.image('ankylosaurus-down-right', 'assets/sprites/enemies/ankylosaurus/ankylosaurus-bottom-right.png');
        this.load.image('ankylosaurus-up-left', 'assets/sprites/enemies/ankylosaurus/ankylosaurus-top-left.png');
        this.load.image('ankylosaurus-up-right', 'assets/sprites/enemies/ankylosaurus/ankylosaurus-top-right.png');

        // Load 8-directional sprites for Compy
        this.load.image('compy-down', 'assets/sprites/enemies/compy/compy-down.png');
        this.load.image('compy-up', 'assets/sprites/enemies/compy/compy-top.png');
        this.load.image('compy-left', 'assets/sprites/enemies/compy/compy-left.png');
        this.load.image('compy-right', 'assets/sprites/enemies/compy/compy-right.png');
        this.load.image('compy-down-left', 'assets/sprites/enemies/compy/compy-down-left.png');
        this.load.image('compy-down-right', 'assets/sprites/enemies/compy/compy-down-right.png');
        this.load.image('compy-up-left', 'assets/sprites/enemies/compy/compy-top-left.png');
        this.load.image('compy-up-right', 'assets/sprites/enemies/compy/compy-top-right.png');

        // Load 8-directional sprites for Archaeopteryx
        this.load.image('archaeopteryx-down', 'assets/sprites/enemies/archaeopteryx/archaeopteryx-bottom.png');
        this.load.image('archaeopteryx-up', 'assets/sprites/enemies/archaeopteryx/archaeopteryx-top.png');
        this.load.image('archaeopteryx-left', 'assets/sprites/enemies/archaeopteryx/archaeopteryx-left.png');
        this.load.image('archaeopteryx-right', 'assets/sprites/enemies/archaeopteryx/archaeopteryx-right.png');
        this.load.image('archaeopteryx-down-left', 'assets/sprites/enemies/archaeopteryx/archaeopteryx-bottom-left.png');
        this.load.image('archaeopteryx-down-right', 'assets/sprites/enemies/archaeopteryx/archaeopteryx-bottom-right.png');
        this.load.image('archaeopteryx-up-left', 'assets/sprites/enemies/archaeopteryx/archaeopteryx-top-left.png');
        this.load.image('archaeopteryx-up-right', 'assets/sprites/enemies/archaeopteryx/archaeopteryx-top-right.png');

        // Load 8-directional sprites for Pteranodon
        this.load.image('pteranodon-down', 'assets/sprites/enemies/pteranodon/pteranodon-bottom.png');
        this.load.image('pteranodon-up', 'assets/sprites/enemies/pteranodon/pteranodon-top.png');
        this.load.image('pteranodon-left', 'assets/sprites/enemies/pteranodon/pteranodon-left.png');
        this.load.image('pteranodon-right', 'assets/sprites/enemies/pteranodon/pteranodon-right.png');
        this.load.image('pteranodon-down-left', 'assets/sprites/enemies/pteranodon/pteranodon-bottom-left.png');
        this.load.image('pteranodon-down-right', 'assets/sprites/enemies/pteranodon/pteranodon-bottom-right.png');
        this.load.image('pteranodon-up-left', 'assets/sprites/enemies/pteranodon/pteranodon-top-left.png');
        this.load.image('pteranodon-up-right', 'assets/sprites/enemies/pteranodon/pteranodon-top-right.png');

        // Load Iron Jaw (T-Rex) boss sprite (4 directional views in 2x2 grid)
        this.load.spritesheet('trex-boss', 'assets/sprites/enemies/trex.png', {
            frameWidth: 128,
            frameHeight: 128
        });

        // Load Spiny Terror (Spinosaurus) boss sprite (4 directional views in 2x2 grid)
        this.load.spritesheet('spinosaurus-boss', 'assets/sprites/enemies/spinosaurus.png', {
            frameWidth: 128,
            frameHeight: 128
        });

        // Load Spinosaurus tail segment sprite (4 variations in 2x2 grid)
        this.load.spritesheet('spinosaurus-tail-segment', 'assets/sprites/enemies/spinosaurus_tail.png', {
            frameWidth: 64,
            frameHeight: 64
        });

        // Load The Behemoth (Triceratops) boss sprite - Phase 1 (4 directional views in 2x2 grid)
        this.load.spritesheet('triceratops-boss', 'assets/sprites/enemies/triceratops.png', {
            frameWidth: 128,
            frameHeight: 128
        });

        // Load The Behemoth (Triceratops) boss sprite - Phase 2 evolved form (4 directional views in 2x2 grid)
        this.load.spritesheet('triceratops-evolved', 'assets/sprites/enemies/triceratops_evolved.png', {
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
        this.createEnemyIdleAnimation('velociraptor-bandit', 2); // 2 frames

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
