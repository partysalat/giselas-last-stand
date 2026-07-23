export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        const assetBase = this.registry.get('assetBase');
        if (assetBase) {
            this.load.setBaseURL(assetBase);
        }

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

        // Animated enemy sprites: each type has an 8-frame walk loop (facing the
        // camera), an 8-frame walk-back loop (facing away, used when moving up/
        // away from the player), and an 8-frame attack loop (256x256 per frame),
        // generated via SpriteCook. Left/right facing is achieved with
        // sprite.flipX rather than separate art - see Enemy.js updateDirection().
        const animatedEnemyTypes = ['velociraptor', 'compy', 'ankylosaurus', 'archaeopteryx', 'pteranodon'];
        for (const type of animatedEnemyTypes) {
            this.load.spritesheet(`${type}-walk`, `assets/sprites/enemies/${type}/${type}-walk.png`, {
                frameWidth: 256,
                frameHeight: 256
            });
            this.load.spritesheet(`${type}-walk-back`, `assets/sprites/enemies/${type}/${type}-walk-back.png`, {
                frameWidth: 256,
                frameHeight: 256
            });
            this.load.spritesheet(`${type}-attack`, `assets/sprites/enemies/${type}/${type}-attack.png`, {
                frameWidth: 256,
                frameHeight: 256
            });
        }

        // Animated boss sprites - same walk/walk-back/attack scheme as regular
        // enemies. Triceratops has two sprite sets (phase 1 and the electric-blue
        // evolved phase 2) swapped at runtime in transitionToPhase2Triceratops().
        const animatedBossTypes = ['trex', 'spinosaurus', 'triceratops', 'triceratops-evolved'];
        for (const type of animatedBossTypes) {
            this.load.spritesheet(`${type}-walk`, `assets/sprites/enemies/${type}/${type}-walk.png`, {
                frameWidth: 256,
                frameHeight: 256
            });
            this.load.spritesheet(`${type}-walk-back`, `assets/sprites/enemies/${type}/${type}-walk-back.png`, {
                frameWidth: 256,
                frameHeight: 256
            });
            this.load.spritesheet(`${type}-attack`, `assets/sprites/enemies/${type}/${type}-attack.png`, {
                frameWidth: 256,
                frameHeight: 256
            });
        }

        // Triceratops evolved (phase 2) roar/summon cycle - played when it calls
        // in minions (spawnMinions), phase 1 never summons so it has no equivalent
        this.load.spritesheet('triceratops-evolved-summon', 'assets/sprites/enemies/triceratops-evolved/triceratops-evolved-summon.png', {
            frameWidth: 256,
            frameHeight: 256
        });

        // Load Spinosaurus tail segment sprite (4 variations in 2x2 grid) - still
        // static art, unrelated to the boss's own walk/attack animation
        this.load.spritesheet('spinosaurus-tail-segment', 'assets/sprites/enemies/spinosaurus_tail.png', {
            frameWidth: 64,
            frameHeight: 64
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

        // Isometric floor tile (64x32 diamond), generated from the tiki bamboo-floor texture
        this.load.image('iso-floor-tile', 'assets/sprites/environment/iso-floor-tile.png');

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

        // this.load.image('barrel', 'assets/sprites/environment/barrel.png');
        // this.load.image('saloon-doors', 'assets/sprites/environment/saloon-doors.png');

        // === UI ===

        // this.load.image('bounty-poster', 'assets/ui/bounty-poster.png');
    }

    create() {
        console.log('Assets loaded, creating animations...');

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

        // Enemy/boss animations: 8-frame walk/walk-back (looping) and 8-frame attack (one-shot) per type
        const animatedEnemyTypes = ['velociraptor', 'compy', 'ankylosaurus', 'archaeopteryx', 'pteranodon'];
        const animatedBossTypes = ['trex', 'spinosaurus', 'triceratops', 'triceratops-evolved'];
        for (const type of [...animatedEnemyTypes, ...animatedBossTypes]) {
            this.anims.create({
                key: `${type}-walk`,
                frames: this.anims.generateFrameNumbers(`${type}-walk`, { start: 0, end: 7 }),
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: `${type}-walk-back`,
                frames: this.anims.generateFrameNumbers(`${type}-walk-back`, { start: 0, end: 7 }),
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: `${type}-attack`,
                frames: this.anims.generateFrameNumbers(`${type}-attack`, { start: 0, end: 7 }),
                frameRate: 10,
                repeat: 0
            });
        }

        // Triceratops evolved (phase 2) roar/summon - one-shot, no walk-back equivalent
        this.anims.create({
            key: 'triceratops-evolved-summon',
            frames: this.anims.generateFrameNumbers('triceratops-evolved-summon', { start: 0, end: 7 }),
            frameRate: 10,
            repeat: 0
        });

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

}
