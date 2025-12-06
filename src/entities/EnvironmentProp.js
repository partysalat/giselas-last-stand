/**
 * Base class for all environment props
 * Provides core functionality for destructible objects in the saloon
 */
export class EnvironmentProp {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.type = type;
        this.alive = true;
        this.x = x;
        this.y = y;

        // Load configuration from PROP_TYPES
        this.loadConfig();

        // Initialize health
        this.health = this.maxHealth;

        // Create visual representation
        this.createSprite();

        // Setup physics body
        this.setupPhysics();
    }

    /**
     * Load prop configuration from PROP_TYPES
     */
    loadConfig() {
        const config = PROP_TYPES[this.type];
        if (!config) {
            throw new Error(`Unknown prop type: ${this.type}`);
        }

        // Basic properties
        this.name = config.name;
        this.className = config.class;
        this.maxHealth = config.maxHealth;
        this.width = config.width;
        this.height = config.height;
        this.weightClass = config.weightClass;
        this.color = config.color;
        this.blocksBullets = config.blocksBullets !== undefined ? config.blocksBullets : true;
        this.layer = config.layer || 'ground';

        // Footprint properties for movement collision (isometric)
        this.footprintWidth = config.footprintWidth || this.width * 0.5;
        this.footprintHeight = config.footprintHeight || this.height * 0.5;
        this.footprintShape = config.footprintShape || 'rectangle';

        // Sprite properties
        this.spriteKey = config.spriteKey || null;
        this.spriteFrame = config.spriteFrame !== undefined ? config.spriteFrame : null;

        // Special properties
        this.onDestroy = config.onDestroy || null;

        // Hazard properties
        this.fireRadius = config.fireRadius || 0;
        this.fireDuration = config.fireDuration || 0;
        this.fireDamage = config.fireDamage || 0;
        this.explosionRadius = config.explosionRadius || 0;
        this.explosionDamage = config.explosionDamage || 0;

        // Physics properties (Phase 2)
        this.impactDamage = config.impactDamage || 0;
        this.impactSpeed = config.impactSpeed || 50; // Minimum speed to deal damage
        this.friction = config.friction || 0.92;

        // Tactical properties (Phase 4)
        this.interactive = config.interactive || false;
        this.activationRadius = config.activationRadius || 0;
        this.onActivate = config.onActivate || null;
        this.stunRadius = config.stunRadius || 0;
        this.stunDuration = config.stunDuration || 0;
        this.maxUses = config.maxUses || 0;
        this.cooldown = config.cooldown || 0;
        this.fallDamage = config.fallDamage || 0;
        this.fallRadius = config.fallRadius || 0;
        this.fallDirection = config.fallDirection || null;

        // Tactical state tracking
        this.usesRemaining = this.maxUses;
        this.lastActivationTime = 0;
        this.isOnCooldown = false;

        // Chandelier state tracking (Phase 5)
        this.chandelierState = 'stable'; // stable, swaying, falling
        this.darkenRadius = config.darkenRadius || 0;

        // Phase 7: Additional special properties
        this.flashRadius = config.flashRadius || 0;
        this.flashDuration = config.flashDuration || 0;
        this.glassShardRadius = config.glassShardRadius || 0;
        this.glassShardDamage = config.glassShardDamage || 0;
        this.glassShardDuration = config.glassShardDuration || 0;
        this.wetZoneRadius = config.wetZoneRadius || 0;
        this.wetZoneDuration = config.wetZoneDuration || 0;
        this.electricalMultiplier = config.electricalMultiplier || 1.0;
        this.flammable = config.flammable || false;
        this.fireSpreadMultiplier = config.fireSpreadMultiplier || 1.0;
        this.knockbackForce = config.knockbackForce || 0;
    }

    /**
     * Create the visual sprite representation
     */
    createSprite() {
        // Check if we should use a sprite from a spritesheet
        if (this.spriteKey && this.spriteFrame !== null) {
            // Create sprite from spritesheet
            this.sprite = this.scene.add.sprite(
                this.x,
                this.y,
                this.spriteKey,
                this.spriteFrame
            );

            // Scale sprite to approximate collision box size while maintaining aspect ratio
            // Sprites are 341x341, we want them to visually match the collision box
            // Use the larger dimension (width or height) to determine scale
            const spriteSize = 341; // Original sprite size
            const targetScale = Math.max(this.width, this.height) / spriteSize;

            // Apply a multiplier to make sprites larger and more visible
            // Small/medium props get boosted more to improve visibility
            let visualMultiplier = 1.0;
            const maxDimension = Math.max(this.width, this.height);

            if (maxDimension <= 40) {
                // Very small props (chairs, lamps, stools) - make them much larger
                visualMultiplier = 3.5;
            } else if (maxDimension <= 70) {
                // Medium props (barrels, crates, tables) - make them larger
                visualMultiplier = 2.5;
            } else {
                // Large props (counters, pianos) - make them larger too
                visualMultiplier = 2.0;
            }

            const visualScale = targetScale * visualMultiplier;
            this.visualScale = visualScale;

            this.sprite.setScale(visualScale);
        } else {
            // Fallback to rectangle sprite for props without sprites
            this.sprite = this.scene.add.rectangle(
                this.x,
                this.y,
                this.width,
                this.height,
                this.color
            );

            // Explosive barrels get red border for visibility
            if (this.explosionRadius > 0) {
                this.sprite.setStrokeStyle(5, 0xFF0000); // Thick red border
            } else {
                this.sprite.setStrokeStyle(3, 0x000000);
            }
        }

        // Set initial depth based on layer and Y position for isometric sorting
        const baseDepthMap = {
            'floor': 2,     // Floor elements (trapdoors) - below everything
            'ground': 5,    // Ground level props
            'wall': 4,      // Wall-mounted props
            'table': 6,     // Table-level props
            'structure': 7, // Structural elements
            'ceiling': 35   // Ceiling-mounted props
        };

        // Calculate depth: base layer depth + Y position for isometric sorting
        // Use the bottom of the prop sprite for proper isometric depth
        // Props closer to bottom of screen (higher Y) render on top
        const baseDepth = baseDepthMap[this.layer] || 5;
        const spriteBottom = this.y + (this.sprite.displayHeight / 2);
        const depthOffset = spriteBottom / 10;
        this.sprite.setDepth(baseDepth + depthOffset);

        // Create health bar (initially hidden)
        this.createHealthBar();
    }

    /**
     * Create health bar UI elements
     */
    createHealthBar() {
        this.healthBarBg = this.scene.add.rectangle(
            this.x,
            this.y - this.height / 2 - 10,
            this.width,
            4,
            0x000000,
            0.5
        );
        this.healthBarBg.setDepth(50);

        this.healthBarFill = this.scene.add.rectangle(
            this.x,
            this.y - this.height / 2 - 10,
            this.width,
            4,
            0x00ff00,
            0.8
        );
        this.healthBarFill.setDepth(50);

        // Hide health bar initially
        this.healthBarBg.setVisible(false);
        this.healthBarFill.setVisible(false);
    }

    /**
     * Setup physics body
     */
    setupPhysics() {
        // Don't create physics body for:
        // - Explosive props (need to be selectable/targetable, shouldn't block movement)
        // - Hazard props (shouldn't block movement)
        // - Ceiling-mounted props (chandeliers, hanging lamps)
        // - Floor props (trapdoors - should be passable)
        if (this.explosionRadius > 0 ||
            this.className === 'HazardProp' ||
            this.layer === 'ceiling' ||
            this.layer === 'floor') {
            // No physics body
            return;
        }

        // Determine if prop should be static or dynamic based on weight class
        const isStatic = this.weightClass === 'heavy' || this.weightClass === null;

        this.scene.physics.add.existing(this.sprite, isStatic);

        // Configure collision body
        // Use footprint size for physics body (not full sprite size)
        // This creates natural isometric collision where players can walk close to tall props
        // Calculate footprint as percentage of the scaled visual sprite
        const footprintWidthRatio = this.footprintWidth / this.width;   // e.g., 45/80 = 0.5625
        const footprintHeightRatio = this.footprintHeight / this.height; // e.g., 35/60 = 0.583

        const physicsWidth = this.sprite.displayWidth * footprintWidthRatio;
        const physicsHeight = this.sprite.displayHeight * footprintHeightRatio;

        // Set the body size and let Phaser center it automatically
        // The third parameter (true) centers the physics body on the sprite
        this.sprite.body.setSize(physicsWidth, physicsHeight, true);

        // For dynamic (light) props, enable physics interactions
        if (!isStatic) {
            this.sprite.body.setMass(this.weightClass === 'light' ? 1 : 3);
            this.sprite.body.setCollideWorldBounds(true);
            this.sprite.body.setBounce(0.3);
            this.sprite.body.setDrag(200); // Friction
        }

        // Show sprite bounds debug if enabled
        if (this.scene.showCollisionBoxes) {
            this.showSpriteBoundsDebug();
        }
    }

    /**
     * Show red outline for full sprite bounds (bullet collision area)
     */
    showSpriteBoundsDebug() {
        if (!this.scene.showCollisionBoxes) return;

        this.hideSpriteBoundsDebug();

        // Red outline: Full sprite bounds (what bullets collide with)
        // This is larger than the physics footprint for movement
        this.spriteBoundsDebug = this.scene.add.rectangle(
            this.x,
            this.y,
            this.width,
            this.height,
            0xFF0000,
            0
        );
        this.spriteBoundsDebug.setStrokeStyle(2, 0xFF0000, 0.5);
        this.spriteBoundsDebug.setDepth(1000);
    }

    /**
     * Hide sprite bounds debug visualization
     */
    hideSpriteBoundsDebug() {
        if (this.spriteBoundsDebug) {
            this.spriteBoundsDebug.destroy();
            this.spriteBoundsDebug = null;
        }
    }

    /**
     * Handle damage taken by the prop
     */
    takeDamage(amount) {
        if (!this.alive) return;

        this.health -= amount;

        // Show health bar when first damaged
        if (this.healthBarBg && this.healthBarFill) {
            this.healthBarBg.setVisible(true);
            this.healthBarFill.setVisible(true);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
        } else {
            this.updateVisuals();
        }
    }

    /**
     * Update visual appearance based on damage state
     * Phase 5: Enhanced multi-stage degradation
     */
    updateVisuals() {
        const healthPercent = this.health / this.maxHealth;

        // Multi-stage visual degradation (Phase 5 enhanced)
        // Pristine (100-66% HP): Full visual, no health bar initially
        // Damaged (65-33% HP): Cracks visible, health bar appears, alpha to 0.8
        // Breaking (32-1% HP): Barely holding, flashing health bar, alpha to 0.6
        // Destroyed (0% HP): Special effect, debris, alpha to 0.4

        if (healthPercent > 0.66) {
            // Pristine stage - full opacity, health bar hidden for pristine props
            this.sprite.setAlpha(1.0);

            // Hide health bar for pristine props
            if (this.healthBarBg && this.healthBarFill && healthPercent > 0.99) {
                this.healthBarBg.setVisible(false);
                this.healthBarFill.setVisible(false);
            }
        } else if (healthPercent > 0.33) {
            // Damaged stage - cracks visible, health bar appears, alpha to 0.8
            this.sprite.setAlpha(0.8);

            // Show health bar when damaged
            if (this.healthBarBg && this.healthBarFill) {
                this.healthBarBg.setVisible(true);
                this.healthBarFill.setVisible(true);
            }

            // Add damage cracks visual effect (darker border) - only for rectangles
            if (this.sprite.setStrokeStyle && this.sprite.strokeAlpha !== 1.0) {
                this.sprite.setStrokeStyle(3, 0x000000, 1.0);
            }
        } else {
            // Breaking stage - barely holding, flashing health bar, alpha to 0.6
            this.sprite.setAlpha(0.6);

            // Show health bar
            if (this.healthBarBg && this.healthBarFill) {
                this.healthBarBg.setVisible(true);
                this.healthBarFill.setVisible(true);

                // Start flashing effect for critical health
                if (!this.isFlashing) {
                    this.isFlashing = true;
                    this.startHealthBarFlashing();
                }
            }

            // Heavy damage visual (red tint) - only for rectangles
            if (this.sprite.setFillStyle) {
                // Mix the original color with red for damage effect
                const redTinted = Phaser.Display.Color.GetColor(255, 136, 136);
                this.sprite.setFillStyle(redTinted, 0.8);
            } else if (this.sprite.setTint) {
                // For sprites, use red tint
                this.sprite.setTint(0xff8888);
            }
        }

        // Update health bar width and color
        if (this.healthBarFill) {
            this.healthBarFill.width = this.width * healthPercent;
            this.healthBarFill.x = this.x - this.width / 2 + (this.width * healthPercent) / 2;

            // Color transition: green -> yellow -> red
            if (healthPercent > 0.5) {
                this.healthBarFill.setFillStyle(0x00ff00, 0.8); // Green
            } else if (healthPercent > 0.25) {
                this.healthBarFill.setFillStyle(0xffff00, 0.8); // Yellow
            } else {
                this.healthBarFill.setFillStyle(0xff0000, 0.8); // Red
            }
        }
    }

    /**
     * Start flashing effect for health bar when critically damaged
     */
    startHealthBarFlashing() {
        if (!this.healthBarFill) return;

        // Create pulsing animation
        this.scene.tweens.add({
            targets: this.healthBarFill,
            alpha: { from: 0.8, to: 0.3 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Destroy the prop and trigger effects
     */
    destroy() {
        if (!this.alive) return;

        this.alive = false;

        // Create destruction particles
        this.createDestructionEffect();

        // Trigger special destruction effects based on prop type
        // Check for explosionRadius OR onDestroy flag
        if (this.onDestroy || this.explosionRadius > 0) {
            this.triggerDestructionEffect();
        }

        // Clean up sprite bounds debug
        this.hideSpriteBoundsDebug();

        // Clean up health bar
        if (this.healthBarBg) {
            this.healthBarBg.destroy();
            this.healthBarBg = null;
        }
        if (this.healthBarFill) {
            this.healthBarFill.destroy();
            this.healthBarFill = null;
        }

        // Destroy sprite after a brief delay for particles
        if (this.sprite) {
            this.scene.time.delayedCall(100, () => {
                if (this.sprite) {
                    this.sprite.destroy();
                    this.sprite = null;
                }
            });
        }
    }

    /**
     * Create particle effect on destruction
     */
    createDestructionEffect() {
        const numParticles = 5 + Math.floor(Math.random() * 4);

        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.5;
            const speed = 100 + Math.random() * 100;
            const size = 4 + Math.random() * 6;

            const particle = this.scene.add.circle(
                this.x,
                this.y,
                size,
                this.color,
                0.8
            );
            particle.setDepth(25);

            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Trigger special destruction effects (fire, explosion, etc.)
     */
    triggerDestructionEffect() {
        // Handle explosion effects
        if (this.explosionRadius > 0) {
            this.explode();
        }

        // Phase 3: Handle fire zone creation
        if (this.onDestroy === 'createFireZone' && this.fireRadius > 0) {
            this.createFireZone();
        }

        // Phase 4: Handle stage light falling
        if (this.onDestroy === 'fallAndDealDamage') {
            this.fallAndDealDamage();
        }

        // Phase 7: Handle new special destruction effects
        switch (this.onDestroy) {
            case 'spawnBottleDebris':
                this.spawnBottleDebris();
                break;
            case 'playDiscordantNotes':
                this.playDiscordantNotes();
                break;
            case 'dropBooks':
                this.dropBooks();
                break;
            case 'dropCoins':
                this.dropCoins();
                break;
            case 'spawnSplinters':
                this.spawnSplinters();
                break;
            case 'createLiquidTrailFire':
                this.createLiquidTrailFire();
                break;
            case 'triggerChainExplosions':
                this.triggerChainExplosions();
                break;
            case 'createBlindingFlash':
                this.createBlindingFlash();
                break;
            case 'createGlassShardHazard':
                this.createGlassShardHazard();
                break;
            case 'spillWater':
                this.spillWater();
                break;
        }
    }

    /**
     * Create fire zone on destruction (Phase 3)
     */
    createFireZone() {
        if (!this.scene.environmentManager || !this.scene.environmentManager.fireSystem) {
            console.warn('FireSystem not available - cannot create fire zone');
            return;
        }

        // Create fire zone using configured properties
        this.scene.environmentManager.fireSystem.createFireZone(
            this.x,
            this.y,
            this.fireRadius,
            this.fireDuration,
            this.fireDamage
        );

        console.log(`${this.name} destroyed - fire zone created!`);
    }

    /**
     * Create explosion effect and damage
     */
    explode() {
        // Visual explosion effect
        const explosion = this.scene.add.circle(
            this.x,
            this.y,
            this.explosionRadius,
            0xFF4500,
            0.6
        );
        explosion.setDepth(25);

        // DEBUG: Show physics force radius (slightly larger, blue outline)
        const forceRadius = this.scene.add.circle(
            this.x,
            this.y,
            this.explosionRadius,
            0x0000FF,
            0
        );
        forceRadius.setStrokeStyle(3, 0x00FFFF);
        forceRadius.setDepth(25);

        this.scene.tweens.add({
            targets: [explosion, forceRadius],
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.8, to: 0 },
            duration: 400,
            onComplete: () => {
                explosion.destroy();
                forceRadius.destroy();
            }
        });

        // Damage entities in radius
        this.scene.time.delayedCall(50, () => {
            this.damageInRadius(this.x, this.y, this.explosionRadius, this.explosionDamage);
        });

        // Phase 2: Apply explosion force to nearby props
        if (this.scene.environmentManager && this.scene.environmentManager.physicsManager) {
            this.scene.environmentManager.physicsManager.applyExplosionForce(
                this.x,
                this.y,
                this.explosionRadius,
                600 // Force magnitude (increased for better visibility)
            );
        }
    }

    /**
     * Damage all entities in radius
     */
    damageInRadius(x, y, radius, damage) {
        // Damage players
        if (this.scene.playerManager) {
            this.scene.playerManager.getLivingPlayers().forEach(player => {
                const dx = player.getX() - x;
                const dy = player.getY() - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    player.takeDamage(damage);
                }
            });
        }

        // Damage enemies
        if (this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                if (!enemy.isAlive()) return;

                const dx = enemy.getSprite().x - x;
                const dy = enemy.getSprite().y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    enemy.takeDamage(damage);
                }
            });
        }

        // Damage other props via environment manager
        if (this.scene.environmentManager) {
            this.scene.environmentManager.damagePropsInRadius(x, y, radius, damage, this);
        }
    }

    /**
     * Check if bullet collides with this prop
     */
    checkBulletCollision(bulletX, bulletY) {
        if (!this.alive || !this.blocksBullets) return false;

        // AABB collision check
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        return (
            bulletX >= this.x - halfWidth &&
            bulletX <= this.x + halfWidth &&
            bulletY >= this.y - halfHeight &&
            bulletY <= this.y + halfHeight
        );
    }

    /**
     * Per-frame update (override in subclasses if needed)
     */
    update(delta) {
        // Base class has no per-frame logic
        // Subclasses can override for dynamic behavior

        // Update cooldown state for tactical props
        if (this.isOnCooldown && this.cooldown > 0) {
            const timeSinceActivation = Date.now() - this.lastActivationTime;
            if (timeSinceActivation >= this.cooldown) {
                this.isOnCooldown = false;
            }
        }

        // Update chandelier swaying animation (Phase 5)
        if (this.type === 'chandelier' && this.chandelierState === 'swaying') {
            this.updateChandelierSwaying();
        }

        // Update trapdoor - check if player or enemy is standing on it
        if (this.type === 'trapdoor' && this.alive) {
            this.updateTrapdoor();
        }

        // Update depth if prop is moving (isometric sorting)
        if (this.physicsData) {
            const speed = Math.sqrt(
                this.physicsData.velocityX ** 2 +
                this.physicsData.velocityY ** 2
            );
            if (speed > 5) {
                this.updateDepth();
            }
        }
    }

    /**
     * Update sprite depth based on current Y position
     * Called when prop is moving (isometric sorting)
     */
    updateDepth() {
        if (!this.sprite) return;

        const baseDepthMap = {
            'floor': 2,
            'ground': 5,
            'wall': 4,
            'table': 6,
            'structure': 7,
            'ceiling': 35
        };

        const baseDepth = baseDepthMap[this.layer] || 5;
        const spriteBottom = this.y + (this.sprite.displayHeight / 2);
        const depthOffset = spriteBottom / 10;

        this.sprite.setDepth(baseDepth + depthOffset);
    }

    /**
     * Check if trapdoor should open when stepped on
     */
    updateTrapdoor() {
        // Initialize trapdoor state if not set
        if (!this.trapdoorState) {
            this.trapdoorState = 'closed';
        }

        // Skip if already open
        if (this.trapdoorState === 'open') return;

        const triggerRadius = 30; // Distance to trigger trapdoor
        let shouldOpen = false;

        // Check if any player is standing on trapdoor
        if (this.scene.playerManager) {
            this.scene.playerManager.getLivingPlayers().forEach(player => {
                const dx = player.getX() - this.x;
                const dy = player.getY() - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < triggerRadius) {
                    shouldOpen = true;
                }
            });
        }

        // Check if any enemy is standing on trapdoor
        if (!shouldOpen && this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                if (!enemy.isAlive()) return;

                const dx = enemy.getSprite().x - this.x;
                const dy = enemy.getSprite().y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < triggerRadius) {
                    shouldOpen = true;
                }
            });
        }

        // Open trapdoor if triggered
        if (shouldOpen) {
            this.openTrapdoor();
        }
    }

    /**
     * Open the trapdoor
     */
    openTrapdoor() {
        if (this.trapdoorState === 'open') return;

        console.log(`Trapdoor at (${this.x}, ${this.y}) opening!`);
        this.trapdoorState = 'open';

        // Change sprite to open trapdoor variant (frame 3)
        if (this.sprite && this.spriteKey === 'interior5') {
            this.sprite.setFrame(3); // Middle-left in 3x3 grid (open trapdoor)
        }

        // Visual effect - dust/particles
        this.createTrapdoorOpenEffect();

        // Deal damage to entities on the trapdoor
        this.dealTrapdoorDamage();
    }

    /**
     * Deal damage to players and enemies standing on the trapdoor
     */
    dealTrapdoorDamage() {
        const damageRadius = 35; // Slightly larger than trigger radius
        const playerDamage = 25; // Players take damage but survive
        const enemyDamage = 9999; // Enemies fall to their death (instant kill)

        // Damage players
        if (this.scene.playerManager) {
            this.scene.playerManager.getLivingPlayers().forEach(player => {
                const dx = player.getX() - this.x;
                const dy = player.getY() - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < damageRadius) {
                    console.log(`Player fell into trapdoor! Taking ${playerDamage} damage`);
                    player.takeDamage(playerDamage);
                }
            });
        }

        // Kill enemies
        if (this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                if (!enemy.isAlive()) return;

                const dx = enemy.getSprite().x - this.x;
                const dy = enemy.getSprite().y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < damageRadius) {
                    console.log(`Enemy fell into trapdoor! Instant death`);
                    enemy.takeDamage(enemyDamage);

                    // Create falling animation for enemy
                    this.createEnemyFallEffect(enemy);
                }
            });
        }
    }

    /**
     * Create visual effect for enemy falling into trapdoor
     */
    createEnemyFallEffect(enemy) {
        const enemySprite = enemy.getSprite();
        if (!enemySprite) return;

        // Animate enemy falling down and fading
        this.scene.tweens.add({
            targets: enemySprite,
            y: enemySprite.y + 50,
            alpha: 0,
            scale: 0.5,
            duration: 400,
            ease: 'Cubic.easeIn'
        });
    }

    /**
     * Create visual effect when trapdoor opens
     */
    createTrapdoorOpenEffect() {
        const numParticles = 8;

        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const distance = 20 + Math.random() * 20;

            const particle = this.scene.add.circle(
                this.x,
                this.y,
                3 + Math.random() * 3,
                0x8B4513, // Brown dust
                0.6
            );
            particle.setDepth(10);

            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 300,
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Set chandelier state (Phase 5)
     * @param {string} state - 'stable', 'swaying', or 'falling'
     */
    setState(state) {
        if (this.type !== 'chandelier') return;

        this.chandelierState = state;
        console.log(`Chandelier state changed to: ${state}`);

        // Visual feedback for state changes
        if (state === 'swaying') {
            this.startSwayingAnimation();
        } else if (state === 'falling') {
            // Falling is handled by fall() method
        }
    }

    /**
     * Start swaying animation for chandelier
     */
    startSwayingAnimation() {
        // Create a gentle swaying motion
        this.scene.tweens.add({
            targets: this.sprite,
            rotation: 0.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Visual warning effect
        const warning = this.scene.add.circle(this.x, this.y, this.width / 2, 0xFF0000, 0);
        warning.setStrokeStyle(2, 0xFF0000);
        warning.setDepth(36);

        this.scene.tweens.add({
            targets: warning,
            alpha: { from: 0.6, to: 0 },
            duration: 800,
            repeat: 2,
            onComplete: () => warning.destroy()
        });
    }

    /**
     * Update chandelier swaying (per-frame)
     */
    updateChandelierSwaying() {
        // Swaying is handled by tween, this is just for additional effects if needed
        // Could add particle effects, sound, etc.
    }

    /**
     * Trigger chandelier fall (Phase 5)
     */
    fall() {
        if (this.type !== 'chandelier') return;
        if (!this.alive) return;

        console.log(`Chandelier falling at (${this.x}, ${this.y})`);

        this.chandelierState = 'falling';

        // Stop any existing tweens
        this.scene.tweens.killTweensOf(this.sprite);

        // Falling animation
        this.scene.tweens.add({
            targets: this.sprite,
            y: this.y + 150, // Fall down
            rotation: Math.PI * 2, // Spin while falling
            alpha: { from: 1, to: 0.6 },
            duration: 600,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                // Deal fall damage on impact
                this.dealChandelierImpact();

                // Create dark zone
                this.createDarkZone();

                // Destroy chandelier
                this.destroy();
            }
        });

        // Create falling particle trail
        const particleTimer = this.scene.time.addEvent({
            delay: 50,
            repeat: 10,
            callback: () => {
                if (this.sprite) {
                    const particle = this.scene.add.circle(
                        this.sprite.x + (Math.random() - 0.5) * 20,
                        this.sprite.y,
                        2 + Math.random() * 3,
                        this.color,
                        0.6
                    );
                    particle.setDepth(35);

                    this.scene.tweens.add({
                        targets: particle,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => particle.destroy()
                    });
                }
            }
        });
    }

    /**
     * Deal impact damage when chandelier hits the ground
     */
    dealChandelierImpact() {
        const impactX = this.sprite ? this.sprite.x : this.x;
        const impactY = this.sprite ? this.sprite.y : this.y;

        console.log(`Chandelier impact at (${impactX}, ${impactY})`);

        // Visual impact effect
        const impact = this.scene.add.circle(
            impactX,
            impactY,
            this.fallRadius || 50,
            0xFFFF00,
            0.5
        );
        impact.setDepth(25);

        this.scene.tweens.add({
            targets: impact,
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.8, to: 0 },
            duration: 500,
            onComplete: () => impact.destroy()
        });

        // Deal damage in radius
        const damage = this.fallDamage || 25;
        const radius = this.fallRadius || 50;
        this.damageInRadius(impactX, impactY, radius, damage);

        // Camera shake for impact
        if (this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(200, 0.01);
        }
    }

    /**
     * Create permanent dark zone where chandelier fell
     */
    createDarkZone() {
        const impactX = this.sprite ? this.sprite.x : this.x;
        const impactY = this.sprite ? this.sprite.y : this.y;
        const radius = this.darkenRadius || 150;

        console.log(`Creating dark zone at (${impactX}, ${impactY}), radius: ${radius}`);

        // Create semi-transparent dark circle
        const darkZone = this.scene.add.circle(
            impactX,
            impactY,
            radius,
            0x000000,
            0.3 // 30% darker (20% as specified in design)
        );
        darkZone.setDepth(2); // Below props but above floor

        // Store reference for potential cleanup later
        if (!this.scene.darkZones) {
            this.scene.darkZones = [];
        }
        this.scene.darkZones.push(darkZone);

        // Optional: Add some broken chandelier debris
        this.createChandelierDebris(impactX, impactY);
    }

    /**
     * Create debris sprites for fallen chandelier
     */
    createChandelierDebris(x, y) {
        // Create 3-5 debris pieces
        const debrisCount = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < debrisCount; i++) {
            const offsetX = (Math.random() - 0.5) * 80;
            const offsetY = (Math.random() - 0.5) * 80;

            const debris = this.scene.add.rectangle(
                x + offsetX,
                y + offsetY,
                10 + Math.random() * 10,
                10 + Math.random() * 10,
                this.color,
                0.6
            );
            debris.setDepth(3);
            debris.setRotation(Math.random() * Math.PI * 2);

            // Debris fades out after 10 seconds
            this.scene.time.delayedCall(10000, () => {
                if (debris) {
                    this.scene.tweens.add({
                        targets: debris,
                        alpha: 0,
                        duration: 2000,
                        onComplete: () => debris.destroy()
                    });
                }
            });
        }
    }

    /**
     * Check if tactical prop can be activated (Phase 4)
     */
    canActivate() {
        if (!this.interactive) return false;
        if (!this.alive) return false;
        if (this.maxUses > 0 && this.usesRemaining <= 0) return false;
        if (this.isOnCooldown) return false;
        return true;
    }

    /**
     * Activate tactical prop effect (Phase 4)
     */
    activate(playerX, playerY) {
        console.log(`Activate called on ${this.name}, canActivate: ${this.canActivate()}`);

        if (!this.canActivate()) {
            console.log(`Cannot activate: alive=${this.alive}, interactive=${this.interactive}, usesRemaining=${this.usesRemaining}, isOnCooldown=${this.isOnCooldown}`);
            return false;
        }

        console.log(`Activating ${this.name} with onActivate: ${this.onActivate}`);

        // Handle activation based on type
        if (this.onActivate === 'stunEnemies') {
            this.stunNearbyEnemies();
        }

        // Update usage tracking
        if (this.maxUses > 0) {
            this.usesRemaining--;
            console.log(`Uses remaining: ${this.usesRemaining}/${this.maxUses}`);
        }

        // Start cooldown
        if (this.cooldown > 0) {
            this.isOnCooldown = true;
            this.lastActivationTime = Date.now();
            console.log(`Cooldown started: ${this.cooldown}ms`);
        }

        // Visual feedback
        this.showActivationEffect();

        return true;
    }

    /**
     * Stun nearby enemies (bell rope effect)
     */
    stunNearbyEnemies() {
        if (!this.scene.enemies || !this.stunRadius || !this.stunDuration) return;

        let stunnedCount = 0;
        this.scene.enemies.forEach(enemy => {
            if (!enemy.isAlive()) return;

            const dx = enemy.getSprite().x - this.x;
            const dy = enemy.getSprite().y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.stunRadius) {
                // Apply stun effect (if enemy has stun method)
                if (enemy.stun) {
                    enemy.stun(this.stunDuration);
                    stunnedCount++;
                }
            }
        });

        console.log(`${this.name} activated - stunned ${stunnedCount} enemies`);
    }

    /**
     * Show visual feedback for activation
     */
    showActivationEffect() {
        // Create expanding ring effect
        const ring = this.scene.add.circle(
            this.x,
            this.y,
            10,
            0xFFFF00,
            0
        );
        ring.setStrokeStyle(4, 0xFFFF00);
        ring.setDepth(25);

        // Animate ring expanding
        this.scene.tweens.add({
            targets: ring,
            radius: this.stunRadius || this.activationRadius || 100,
            alpha: { from: 0.8, to: 0 },
            duration: 400,
            onComplete: () => ring.destroy()
        });
    }

    /**
     * Handle stage light falling (tactical prop)
     */
    fallAndDealDamage(direction) {
        if (!this.alive) return;

        // Calculate fall position based on direction
        const fallDistance = 50;
        const angle = direction || Math.atan2(this.y - 540, this.x - 960); // Default: fall toward center
        const fallX = this.x + Math.cos(angle) * fallDistance;
        const fallY = this.y + Math.sin(angle) * fallDistance;

        // Animate falling
        this.scene.tweens.add({
            targets: this.sprite,
            x: fallX,
            y: fallY,
            rotation: Math.PI * 2,
            duration: 300,
            onComplete: () => {
                // Deal damage in radius on impact
                this.dealFallDamage(fallX, fallY);
                // Destroy the prop
                this.destroy();
            }
        });
    }

    /**
     * Deal damage from falling stage light
     */
    dealFallDamage(x, y) {
        const radius = this.fallRadius || 30;
        const damage = this.fallDamage || 15;

        // Visual impact effect
        const impact = this.scene.add.circle(x, y, radius, 0xFFFF00, 0.4);
        impact.setDepth(25);

        this.scene.tweens.add({
            targets: impact,
            scale: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => impact.destroy()
        });

        // Damage entities in radius
        this.damageInRadius(x, y, radius, damage);
    }

    /**
     * Phase 7: Special destruction effect methods
     */

    /**
     * Spawn bottle debris when bar counter is destroyed
     */
    spawnBottleDebris() {
        const numBottles = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numBottles; i++) {
            const angle = (Math.PI * 2 * i) / numBottles + Math.random() * 0.5;
            const speed = 80 + Math.random() * 80;

            const bottle = this.scene.add.rectangle(
                this.x,
                this.y,
                8,
                12,
                0x228B22, // green bottle
                0.9
            );
            bottle.setDepth(25);

            this.scene.tweens.add({
                targets: bottle,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                rotation: Math.PI * 2,
                alpha: 0,
                duration: 600 + Math.random() * 300,
                onComplete: () => bottle.destroy()
            });
        }
    }

    /**
     * Play discordant piano notes when destroyed
     */
    playDiscordantNotes() {
        console.log(`${this.name} destroyed - playing discordant notes!`);
        // Create visual string snap effect
        const numStrings = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numStrings; i++) {
            const offsetX = (Math.random() - 0.5) * this.width;
            const offsetY = (Math.random() - 0.5) * this.height;

            const string = this.scene.add.line(
                this.x + offsetX,
                this.y + offsetY,
                0, 0,
                20 + Math.random() * 30,
                0,
                0xFFD700
            );
            string.setLineWidth(2);
            string.setDepth(25);

            this.scene.tweens.add({
                targets: string,
                alpha: 0,
                duration: 400,
                onComplete: () => string.destroy()
            });
        }
    }

    /**
     * Drop books that create slow zones
     */
    dropBooks() {
        console.log(`${this.name} destroyed - dropping books!`);
        const numBooks = 4 + Math.floor(Math.random() * 4);

        for (let i = 0; i < numBooks; i++) {
            const angle = (Math.PI * 2 * i) / numBooks + Math.random() * 0.5;
            const distance = 30 + Math.random() * 40;
            const bookX = this.x + Math.cos(angle) * distance;
            const bookY = this.y + Math.sin(angle) * distance;

            // Create book sprite
            const book = this.scene.add.rectangle(
                this.x,
                this.y,
                10,
                15,
                0x8B4513, // brown book
                0.8
            );
            book.setDepth(3);

            // Animate book falling
            this.scene.tweens.add({
                targets: book,
                x: bookX,
                y: bookY,
                rotation: Math.random() * Math.PI,
                duration: 300,
                onComplete: () => {
                    // Create slow zone effect (visual only for now)
                    const slowZone = this.scene.add.circle(
                        bookX,
                        bookY,
                        20,
                        0x0000FF,
                        0.2
                    );
                    slowZone.setDepth(2);

                    // Slow zone lasts 5 seconds
                    this.scene.time.delayedCall(5000, () => {
                        this.scene.tweens.add({
                            targets: [book, slowZone],
                            alpha: 0,
                            duration: 500,
                            onComplete: () => {
                                book.destroy();
                                slowZone.destroy();
                            }
                        });
                    });
                }
            });
        }
    }

    /**
     * Drop coins that distract enemies
     */
    dropCoins() {
        console.log(`${this.name} destroyed - dropping coins!`);
        const numCoins = 5 + Math.floor(Math.random() * 5);

        for (let i = 0; i < numCoins; i++) {
            const angle = (Math.PI * 2 * i) / numCoins + Math.random() * 0.5;
            const speed = 60 + Math.random() * 60;

            const coin = this.scene.add.circle(
                this.x,
                this.y,
                4,
                0xFFD700, // gold
                1.0
            );
            coin.setDepth(25);

            this.scene.tweens.add({
                targets: coin,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 800 + Math.random() * 400,
                onComplete: () => coin.destroy()
            });
        }
    }

    /**
     * Spawn splinter projectiles on crate destruction
     */
    spawnSplinters() {
        console.log(`${this.name} destroyed - spawning splinters!`);
        const numSplinters = 5 + Math.floor(Math.random() * 5);

        for (let i = 0; i < numSplinters; i++) {
            const angle = (Math.PI * 2 * i) / numSplinters + Math.random() * 0.5;
            const speed = 100 + Math.random() * 100;

            const splinter = this.scene.add.line(
                this.x,
                this.y,
                0, 0,
                15 + Math.random() * 10,
                0,
                0x8B4513
            );
            splinter.setLineWidth(3);
            splinter.setDepth(25);
            splinter.setRotation(angle);

            this.scene.tweens.add({
                targets: splinter,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                onComplete: () => splinter.destroy()
            });
        }
    }

    /**
     * Create liquid trail fire (whiskey barrel)
     */
    createLiquidTrailFire() {
        console.log(`${this.name} destroyed - creating liquid trail fire!`);

        // First create the explosion
        if (this.explosionRadius > 0) {
            // Explosion is already handled, just add fire trail
        }

        // Create fire zone at destruction point
        if (this.scene.environmentManager && this.scene.environmentManager.fireSystem) {
            this.scene.environmentManager.fireSystem.createFireZone(
                this.x,
                this.y,
                this.fireRadius,
                this.fireDuration,
                this.fireDamage
            );

            // Create additional fire zones in a trail pattern
            const numTrailZones = 3;
            for (let i = 1; i <= numTrailZones; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 40 * i;
                const trailX = this.x + Math.cos(angle) * distance;
                const trailY = this.y + Math.sin(angle) * distance;

                this.scene.time.delayedCall(i * 200, () => {
                    if (this.scene.environmentManager && this.scene.environmentManager.fireSystem) {
                        this.scene.environmentManager.fireSystem.createFireZone(
                            trailX,
                            trailY,
                            this.fireRadius * 0.7,
                            this.fireDuration,
                            this.fireDamage
                        );
                    }
                });
            }
        }
    }

    /**
     * Trigger chain explosions (dynamite crate)
     */
    triggerChainExplosions() {
        console.log(`${this.name} destroyed - triggering chain explosions!`);

        // Main explosion already handled by explode()
        // Find nearby explosive props and trigger them with delay
        if (this.scene.environmentManager) {
            const nearbyProps = this.scene.environmentManager.getPropsInRadius(
                this.x,
                this.y,
                this.explosionRadius + 50
            );

            nearbyProps.forEach((prop, index) => {
                if (prop === this) return;
                if (prop.explosionRadius > 0 && prop.isAlive()) {
                    // Trigger explosion with delay for dramatic effect
                    this.scene.time.delayedCall((index + 1) * 300, () => {
                        if (prop.isAlive()) {
                            prop.takeDamage(prop.health); // Destroy it
                        }
                    });
                }
            });
        }
    }

    /**
     * Create blinding flash effect (gas lantern)
     */
    createBlindingFlash() {
        console.log(`${this.name} destroyed - creating blinding flash!`);

        // Create bright flash visual
        const flash = this.scene.add.circle(
            this.x,
            this.y,
            this.flashRadius,
            0xFFFFFF,
            0.9
        );
        flash.setDepth(30);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: this.flashDuration,
            onComplete: () => flash.destroy()
        });

        // Create small fire zone
        if (this.scene.environmentManager && this.scene.environmentManager.fireSystem) {
            this.scene.environmentManager.fireSystem.createFireZone(
                this.x,
                this.y,
                this.fireRadius,
                this.fireDuration,
                this.fireDamage
            );
        }

        // TODO: Implement actual blinding effect on enemies (would need enemy system support)
        console.log(`Flash effect would blind enemies in ${this.flashRadius}px radius for ${this.flashDuration}ms`);
    }

    /**
     * Create glass shard hazard zone (mirror)
     */
    createGlassShardHazard() {
        console.log(`${this.name} destroyed - creating glass shard hazard!`);

        // Create glass shard visual effect
        const numShards = 8 + Math.floor(Math.random() * 8);

        for (let i = 0; i < numShards; i++) {
            const angle = (Math.PI * 2 * i) / numShards + Math.random() * 0.3;
            const distance = Math.random() * this.glassShardRadius;
            const shardX = this.x + Math.cos(angle) * distance;
            const shardY = this.y + Math.sin(angle) * distance;

            const shard = this.scene.add.rectangle(
                this.x,
                this.y,
                4 + Math.random() * 6,
                4 + Math.random() * 6,
                0xE0FFFF, // light cyan
                0.8
            );
            shard.setDepth(3);
            shard.setRotation(Math.random() * Math.PI * 2);

            this.scene.tweens.add({
                targets: shard,
                x: shardX,
                y: shardY,
                duration: 200,
                onComplete: () => {
                    // Shard stays on ground as hazard
                    this.scene.time.delayedCall(this.glassShardDuration, () => {
                        this.scene.tweens.add({
                            targets: shard,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => shard.destroy()
                        });
                    });
                }
            });
        }

        // Create hazard zone indicator
        const hazardZone = this.scene.add.circle(
            this.x,
            this.y,
            this.glassShardRadius,
            0x00FFFF,
            0.15
        );
        hazardZone.setDepth(2);

        this.scene.time.delayedCall(this.glassShardDuration, () => {
            this.scene.tweens.add({
                targets: hazardZone,
                alpha: 0,
                duration: 500,
                onComplete: () => hazardZone.destroy()
            });
        });

        // TODO: Implement actual damage to entities in hazard zone
        console.log(`Glass shard hazard zone created: ${this.glassShardDamage} DPS for ${this.glassShardDuration}ms`);
    }

    /**
     * Spill water creating wet zone (water trough)
     */
    spillWater() {
        console.log(`${this.name} destroyed - spilling water!`);

        // Create water spill visual
        const wetZone = this.scene.add.circle(
            this.x,
            this.y,
            this.wetZoneRadius,
            0x4682B4, // steel blue
            0.3
        );
        wetZone.setDepth(2);

        // Create water particle effect
        const numDroplets = 10 + Math.floor(Math.random() * 10);

        for (let i = 0; i < numDroplets; i++) {
            const angle = (Math.PI * 2 * i) / numDroplets + Math.random() * 0.5;
            const distance = Math.random() * this.wetZoneRadius;

            const droplet = this.scene.add.circle(
                this.x,
                this.y,
                3 + Math.random() * 4,
                0x87CEEB, // light blue
                0.6
            );
            droplet.setDepth(25);

            this.scene.tweens.add({
                targets: droplet,
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 600,
                onComplete: () => droplet.destroy()
            });
        }

        // Wet zone persists for duration
        this.scene.time.delayedCall(this.wetZoneDuration, () => {
            this.scene.tweens.add({
                targets: wetZone,
                alpha: 0,
                duration: 2000,
                onComplete: () => wetZone.destroy()
            });
        });

        // TODO: Implement electrical conductor mechanic for Leviathan boss
        console.log(`Wet zone created: ${this.electricalMultiplier}x electrical damage for ${this.wetZoneDuration}ms`);
    }

    /**
     * Accessors
     */
    isAlive() {
        return this.alive;
    }

    getSprite() {
        return this.sprite;
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    getHealthPercent() {
        return this.health / this.maxHealth;
    }

    /**
     * Restore prop to full health (used between waves)
     */
    restoreHealth() {
        this.health = this.maxHealth;

        // Hide health bar when at full health
        if (this.healthBarBg && this.healthBarFill) {
            this.healthBarBg.setVisible(false);
            this.healthBarFill.setVisible(false);
        }

        // Update health bar fill to show full health
        if (this.healthBarFill) {
            this.healthBarFill.width = this.width;
            this.healthBarFill.x = this.x;
            this.healthBarFill.setFillStyle(0x00ff00, 0.8); // Green at full health
        }
    }
}

/**
 * Prop type configurations
 * Phase 1: Basic 5 prop types
 */
export const PROP_TYPES = {
    // Heavy Cover
    barCounter: {
        name: 'Bar Counter',
        class: 'DestructibleCover',
        maxHealth: 200,
        width: 120,
        height: 50,
        weightClass: 'heavy',
        color: 0x654321,
        footprintWidth: 40,   // 33% of 120px visual width
        footprintHeight: 20,  // 40% of 50px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'spawnBottleDebris',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 0  // Top-left in 3x3 grid
    },

    piano: {
        name: 'Piano',
        class: 'DestructibleCover',
        maxHealth: 150,
        width: 90,
        height: 60,
        weightClass: 'heavy',
        color: 0x2F4F4F, // dark slate gray
        footprintWidth: 40,   // 44% of 90px visual width
        footprintHeight: 30,  // 50% of 60px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'playDiscordantNotes',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 1  // Top-center in 3x3 grid
    },

    heavyBookshelf: {
        name: 'Heavy Bookshelf',
        class: 'DestructibleCover',
        maxHealth: 180,
        width: 100,
        height: 40,
        weightClass: 'heavy',
        color: 0x8B4513, // saddle brown
        footprintWidth: 40,   // 40% of 100px visual width
        footprintHeight: 20,  // 50% of 40px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'dropBooks',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 2  // Top-right in 3x3 grid
    },

    flippedPokerTable: {
        name: 'Flipped Poker Table',
        class: 'DestructibleCover',
        maxHealth: 120,
        width: 100,
        height: 60,
        weightClass: 'heavy',
        color: 0x228B22, // forest green felt
        footprintWidth: 45,   // 45% of 100px visual width
        footprintHeight: 30,  // 50% of 60px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        interactive: true,
        activationRadius: 50,
        onActivate: 'flipTable',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 3  // Middle-left in 3x3 grid
    },

    safe: {
        name: 'Safe',
        class: 'DestructibleCover',
        maxHealth: 250,
        width: 50,
        height: 50,
        weightClass: 'heavy',
        color: 0x708090, // slate gray
        footprintWidth: 25,   // 50% of 50px visual width
        footprintHeight: 25,  // 50% of 50px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'dropCoins',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 4  // Middle-center in 3x3 grid
    },

    // Light Cover
    cardTable: {
        name: 'Card Table',
        class: 'DestructibleCover',
        maxHealth: 60,
        width: 80,
        height: 60,
        weightClass: 'light',
        color: 0x006400,
        footprintWidth: 45,   // 56% of 80px visual width
        footprintHeight: 35,  // 58% of 60px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 3  // Middle-left in interior2 3x3 grid
    },

    woodenChair: {
        name: 'Wooden Chair',
        class: 'PhysicsProp',
        maxHealth: 30,
        width: 30,
        height: 30,
        weightClass: 'light',
        color: 0x8B4513,
        footprintWidth: 20,   // 67% of 30px visual width
        footprintHeight: 20,  // 67% of 30px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 5,
        impactSpeed: 100,
        friction: 0.92,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 0  // Top-left in 3x3 grid
    },

    barrel: {
        name: 'Barrel',
        class: 'PhysicsProp',
        maxHealth: 50,
        width: 40,
        height: 40,
        weightClass: 'medium',
        color: 0xA0522D,
        footprintWidth: 30,   // 75% of 40px visual width
        footprintHeight: 30,  // 75% of 40px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 10,
        impactSpeed: 80,
        friction: 0.88,
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 7  // Bottom-center in 3x3 grid
    },

    barStool: {
        name: 'Bar Stool',
        class: 'PhysicsProp',
        maxHealth: 25,
        width: 20,
        height: 20,
        weightClass: 'light',
        color: 0xA0522D, // sienna
        footprintWidth: 15,   // 75% of 20px visual width
        footprintHeight: 15,  // 75% of 20px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 3,
        impactSpeed: 120,
        friction: 0.98, // Rolls continuously when hit
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 1  // Top-center in 3x3 grid
    },

    smallCrate: {
        name: 'Small Crate',
        class: 'PhysicsProp',
        maxHealth: 40,
        width: 35,
        height: 35,
        weightClass: 'light',
        color: 0xDEB887, // burlwood
        footprintWidth: 25,   // 71% of 35px visual width
        footprintHeight: 25,  // 71% of 35px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 3,
        impactSpeed: 100,
        friction: 0.90,
        onDestroy: 'spawnSplinters',
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 2  // Top-right in 3x3 grid
    },

    // Hazard Prop
    oilLamp: {
        name: 'Oil Lamp',
        class: 'HazardProp',
        maxHealth: 20,
        width: 15,
        height: 15,
        weightClass: 'light',
        color: 0xFFD700,
        blocksBullets: true,
        onDestroy: 'createFireZone',
        fireRadius: 40,
        fireDuration: 8000,
        fireDamage: 5,
        layer: 'table',
        spriteKey: 'interior3',
        spriteFrame: 1  // Top-center in 3x3 grid (table lamp)
    },

    // Legacy explosive barrel for compatibility
    explosiveBarrel: {
        name: 'Explosive Barrel',
        class: 'HazardProp',
        maxHealth: 50,
        width: 40,
        height: 40,
        weightClass: 'medium',
        color: 0x8B4513,
        blocksBullets: true,
        explosionRadius: 200, // Increased from 60 for better physics visibility
        explosionDamage: 20,
        layer: 'ground'
    },

    whiskeyBarrel: {
        name: 'Whiskey Barrel',
        class: 'HazardProp',
        maxHealth: 50,
        width: 40,
        height: 40,
        weightClass: 'medium',
        color: 0x8B2500, // brown with red tint
        blocksBullets: true,
        explosionRadius: 60,
        explosionDamage: 20,
        onDestroy: 'createLiquidTrailFire',
        fireRadius: 60,
        fireDuration: 10000,
        fireDamage: 5,
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 3  // Middle-left in 3x3 grid
    },

    dynamiteCrate: {
        name: 'Dynamite Crate',
        class: 'HazardProp',
        maxHealth: 80,
        width: 50,
        height: 50,
        weightClass: 'medium',
        color: 0xD2691E, // chocolate, with red TNT labels
        blocksBullets: true,
        explosionRadius: 100,
        explosionDamage: 30,
        onDestroy: 'triggerChainExplosions',
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 4  // Middle-center in 3x3 grid
    },

    gasLantern: {
        name: 'Gas Lantern',
        class: 'HazardProp',
        maxHealth: 30,
        width: 20,
        height: 20,
        weightClass: 'light',
        color: 0xFFFFE0, // light yellow
        blocksBullets: true,
        onDestroy: 'createBlindingFlash',
        fireRadius: 30,
        fireDuration: 2000,
        fireDamage: 5,
        flashRadius: 150,
        flashDuration: 1000,
        layer: 'table',
        spriteKey: 'interior3',
        spriteFrame: 2  // Top-right in 3x3 grid
    },

    // Phase 4: Tactical Props

    // Stage Lights - shoot to drop and deal damage
    stageLights: {
        name: 'Stage Lights',
        class: 'TacticalProp',
        maxHealth: 40,
        width: 30,
        height: 40,
        weightClass: null,
        color: 0xFFFF00,
        blocksBullets: true,
        onDestroy: 'fallAndDealDamage',
        fallDamage: 15,
        fallRadius: 30,
        layer: 'ceiling',
        spriteKey: 'interior4',
        spriteFrame: 7  // Bottom-center in 3x3 grid
    },

    // Bell Rope - activate to stun enemies
    bellRope: {
        name: 'Bell Rope',
        class: 'TacticalProp',
        maxHealth: 30,
        width: 10,
        height: 60,
        weightClass: null,
        color: 0xCD853F,
        blocksBullets: true,
        interactive: true,
        activationRadius: 50,
        onActivate: 'stunEnemies',
        stunRadius: 600,
        stunDuration: 5000,
        maxUses: 3,
        cooldown: 2000,
        layer: 'ceiling',
        spriteKey: 'interior4',
        spriteFrame: 1  // Top-center in 3x3 grid
    },

    swingingDoors: {
        name: 'Swinging Doors',
        class: 'TacticalProp',
        maxHealth: 60,
        width: 80,
        height: 100,
        weightClass: null,
        color: 0x8B4513, // brown
        footprintWidth: 45,   // 56% of 80px visual width
        footprintHeight: 60,  // 60% of 100px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'autoSwingClosed',
        knockbackForce: 20,
        layer: 'ground',
        spriteKey: 'interior4',
        spriteFrame: 0  // Top-left in 3x3 grid
    },

    stageCurtain: {
        name: 'Stage Curtain',
        class: 'TacticalProp',
        maxHealth: 40,
        width: 100,
        height: 120,
        weightClass: null,
        color: 0x8B0000, // dark red
        blocksBullets: false, // Provides concealment, not protection
        flammable: true,
        fireSpreadMultiplier: 2.0,
        layer: 'wall',
        spriteKey: 'interior4',
        spriteFrame: 2  // Top-right in 3x3 grid
    },

    mirror: {
        name: 'Mirror',
        class: 'TacticalProp',
        maxHealth: 50,
        width: 40,
        height: 60,
        weightClass: null,
        color: 0xC0C0C0, // silver frame
        blocksBullets: true,
        onDestroy: 'createGlassShardHazard',
        glassShardRadius: 25,
        glassShardDamage: 3,
        glassShardDuration: 4000,
        layer: 'wall',
        spriteKey: 'interior4',
        spriteFrame: 5  // Middle-right in 3x3 grid (simple mirror)
    },

    // Phase 5: Chandelier - dynamic prop with falling system
    chandelier: {
        name: 'Chandelier',
        class: 'DynamicProp',
        maxHealth: 100,
        width: 60,
        height: 60,
        weightClass: 'heavy',
        color: 0xFFD700, // Gold
        blocksBullets: false, // Chandeliers don't block bullets (ceiling-mounted)
        fallDamage: 25,
        fallRadius: 50,
        darkenRadius: 150,
        layer: 'ceiling',
        spriteKey: 'interior4',
        spriteFrame: 4  // Middle-center in 3x3 grid
    },

    // Phase 6: Boss Integration Props

    // Support Beam - structural prop that can be destroyed by bosses
    supportBeam: {
        name: 'Support Beam',
        class: 'StructuralProp',
        maxHealth: 300,
        width: 30,
        height: 150,
        weightClass: null,
        color: 0x8B4513,
        footprintWidth: 20,   // 67% of 30px visual width
        footprintHeight: 100, // 67% of 150px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'stageTilt',
        layer: 'structure',
        spriteKey: 'interior5',
        spriteFrame: 1  // Top-center in 3x3 grid
    },

    // Trapdoor - opens from explosions/boss attacks
    trapdoor: {
        name: 'Trapdoor',
        class: 'SpecialProp',
        maxHealth: Infinity,
        width: 60,
        height: 60,
        weightClass: null,
        color: 0x654321,
        blocksBullets: false,
        interactive: false,
        layer: 'floor',
        spriteKey: 'interior5',
        spriteFrame: 2  // Top-right in 3x3 grid (closed state)
    },

    // Phase 7: Additional Special Props

    waterTrough: {
        name: 'Water Trough',
        class: 'SpecialProp',
        maxHealth: 100,
        width: 70,
        height: 40,
        weightClass: 'heavy',
        color: 0x4682B4, // steel blue
        footprintWidth: 30,   // 43% of 70px visual width
        footprintHeight: 18,  // 45% of 40px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'spillWater',
        wetZoneRadius: 80,
        wetZoneDuration: 20000,
        electricalMultiplier: 1.5,
        layer: 'ground',
        spriteKey: 'interior5',
        spriteFrame: 0  // Top-left in 3x3 grid
    },

    // Additional props from interior1 sprite bundle
    woodenChest: {
        name: 'Wooden Chest',
        class: 'DestructibleCover',
        maxHealth: 160,
        width: 80,
        height: 60,
        weightClass: 'heavy',
        color: 0x8B4513, // saddle brown
        footprintWidth: 35,   // 44% of 80px visual width
        footprintHeight: 30,  // 50% of 60px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'dropCoins',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 6  // Bottom-left in 3x3 grid
    },

    cabinet: {
        name: 'Cabinet',
        class: 'DestructibleCover',
        maxHealth: 140,
        width: 70,
        height: 80,
        weightClass: 'heavy',
        color: 0x8B4513, // saddle brown
        footprintWidth: 30,   // 43% of 70px visual width
        footprintHeight: 35,  // 44% of 80px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        onDestroy: 'spawnBottleDebris',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 8  // Bottom-right in 3x3 grid
    },

    // Additional props from interior2 sprite bundle
    standardBarrel: {
        name: 'Standard Barrel',
        class: 'PhysicsProp',
        maxHealth: 50,
        width: 40,
        height: 40,
        weightClass: 'medium',
        color: 0xA0522D,
        footprintWidth: 30,   // 75% of 40px visual width
        footprintHeight: 30,  // 75% of 40px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 10,
        impactSpeed: 80,
        friction: 0.88,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 4  // Middle-center in 3x3 grid
    },

    woodenBench: {
        name: 'Wooden Bench',
        class: 'PhysicsProp',
        maxHealth: 50,
        width: 70,
        height: 30,
        weightClass: 'medium',
        color: 0x8B4513,
        footprintWidth: 50,   // 71% of 70px visual width
        footprintHeight: 22,  // 73% of 30px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 8,
        impactSpeed: 90,
        friction: 0.90,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 5  // Middle-right in 3x3 grid
    },

    smallTable: {
        name: 'Small Table',
        class: 'PhysicsProp',
        maxHealth: 40,
        width: 40,
        height: 40,
        weightClass: 'light',
        color: 0x8B4513,
        footprintWidth: 30,   // 75% of 40px visual width
        footprintHeight: 30,  // 75% of 40px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 5,
        impactSpeed: 100,
        friction: 0.92,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 6  // Bottom-left in 3x3 grid
    },

    woodenStool: {
        name: 'Wooden Stool',
        class: 'PhysicsProp',
        maxHealth: 20,
        width: 25,
        height: 25,
        weightClass: 'light',
        color: 0x8B4513,
        footprintWidth: 18,   // 72% of 25px visual width
        footprintHeight: 18,  // 72% of 25px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 3,
        impactSpeed: 120,
        friction: 0.95,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 7  // Bottom-center in 3x3 grid
    },

    ammunitionBox: {
        name: 'Ammunition Box',
        class: 'DestructibleCover',
        maxHealth: 60,
        width: 35,
        height: 30,
        weightClass: 'medium',
        color: 0x808000, // olive
        footprintWidth: 25,   // 71% of 35px visual width
        footprintHeight: 22,  // 73% of 30px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 8  // Bottom-right in 3x3 grid
    },

    // Additional props from interior3 sprite bundle (hazards)
    hangingOilLamp: {
        name: 'Hanging Oil Lamp',
        class: 'HazardProp',
        maxHealth: 20,
        width: 15,
        height: 30, // Taller due to chain
        weightClass: null,
        color: 0xFFD700,
        blocksBullets: false, // Hanging from ceiling
        onDestroy: 'createFireZone',
        fireRadius: 40,
        fireDuration: 8000,
        fireDamage: 5,
        layer: 'ceiling',
        spriteKey: 'interior3',
        spriteFrame: 0  // Top-left in 3x3 grid
    },

    gunpowderKeg: {
        name: 'Gunpowder Keg',
        class: 'HazardProp',
        maxHealth: 40,
        width: 35,
        height: 35,
        weightClass: 'medium',
        color: 0x2F4F4F, // dark slate gray
        blocksBullets: true,
        explosionRadius: 80,
        explosionDamage: 35,
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 5  // Middle-right in 3x3 grid
    },

    fireBrazier: {
        name: 'Fire Brazier',
        class: 'HazardProp',
        maxHealth: 60,
        width: 30,
        height: 30,
        weightClass: 'medium',
        color: 0xFF4500, // orange red
        blocksBullets: true,
        onDestroy: 'createFireZone',
        fireRadius: 50,
        fireDuration: 12000,
        fireDamage: 8,
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 6  // Bottom-left in 3x3 grid
    },

    molotovBottle: {
        name: 'Molotov Bottle',
        class: 'HazardProp',
        maxHealth: 10,
        width: 15,
        height: 20,
        weightClass: 'light',
        color: 0x8B4513, // brown
        blocksBullets: false,
        onDestroy: 'createFireZone',
        fireRadius: 45,
        fireDuration: 6000,
        fireDamage: 6,
        layer: 'table',
        spriteKey: 'interior3',
        spriteFrame: 7  // Bottom-center in 3x3 grid
    },

    keroseneCanister: {
        name: 'Kerosene Canister',
        class: 'HazardProp',
        maxHealth: 50,
        width: 30,
        height: 35,
        weightClass: 'medium',
        color: 0xFF4500, // red orange
        blocksBullets: true,
        explosionRadius: 70,
        explosionDamage: 25,
        onDestroy: 'createLiquidTrailFire',
        fireRadius: 55,
        fireDuration: 10000,
        fireDamage: 7,
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 8  // Bottom-right in 3x3 grid
    },

    // Additional props from interior4 sprite bundle (tactical)
    ornateMirror: {
        name: 'Ornate Mirror',
        class: 'TacticalProp',
        maxHealth: 60,
        width: 40,
        height: 60,
        weightClass: null,
        color: 0xC0C0C0, // silver frame
        blocksBullets: true,
        onDestroy: 'createGlassShardHazard',
        glassShardRadius: 30,
        glassShardDamage: 4,
        glassShardDuration: 5000,
        layer: 'wall',
        spriteKey: 'interior4',
        spriteFrame: 3  // Middle-left in 3x3 grid
    },

    wantedPosterBoard: {
        name: 'Wanted Poster Board',
        class: 'TacticalProp',
        maxHealth: 80,
        width: 50,
        height: 70,
        weightClass: null,
        color: 0x8B4513, // brown wood
        blocksBullets: true,
        layer: 'wall',
        spriteKey: 'interior4',
        spriteFrame: 6  // Bottom-left in 3x3 grid
    },

    spittoon: {
        name: 'Spittoon',
        class: 'PhysicsProp',
        maxHealth: 40,
        width: 25,
        height: 25,
        weightClass: 'light',
        color: 0xFFD700, // brass/gold
        footprintWidth: 18,   // 72% of 25px visual width
        footprintHeight: 18,  // 72% of 25px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        impactDamage: 5,
        impactSpeed: 110,
        friction: 0.85, // Rolls easily
        layer: 'ground',
        spriteKey: 'interior4',
        spriteFrame: 8  // Bottom-right in 3x3 grid
    },

    // Additional props from interior5 sprite bundle (Bundle 5: Special Props & Structural)

    trapdoorOpen: {
        name: 'Trapdoor (Open)',
        class: 'SpecialProp',
        maxHealth: Infinity,
        width: 60,
        height: 60,
        weightClass: null,
        color: 0x654321,
        blocksBullets: false,
        interactive: false,
        layer: 'floor',
        spriteKey: 'interior5',
        spriteFrame: 3  // Middle-left in 3x3 grid
    },

    stagePlatform: {
        name: 'Stage Platform',
        class: 'StructuralProp',
        maxHealth: 200,
        width: 80,
        height: 60,
        weightClass: 'heavy',
        color: 0x8B4513,
        footprintWidth: 55,   // 69% of 80px visual width
        footprintHeight: 42,  // 70% of 60px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        layer: 'ground',
        spriteKey: 'interior5',
        spriteFrame: 4  // Middle-center in 3x3 grid
    },

    hitchingPost: {
        name: 'Hitching Post',
        class: 'StructuralProp',
        maxHealth: 120,
        width: 20,
        height: 50,
        weightClass: 'heavy',
        color: 0x8B4513,
        footprintWidth: 12,   // 60% of 20px visual width
        footprintHeight: 35,  // 70% of 50px visual height
        footprintShape: 'rectangle',
        blocksBullets: true,
        layer: 'ground',
        spriteKey: 'interior5',
        spriteFrame: 5  // Middle-right in 3x3 grid
    },

    balconyRailing: {
        name: 'Balcony Railing',
        class: 'StructuralProp',
        maxHealth: 100,
        width: 100,
        height: 30,
        weightClass: 'heavy',
        color: 0x8B4513,
        blocksBullets: true,
        layer: 'wall',
        spriteKey: 'interior5',
        spriteFrame: 6  // Bottom-left in 3x3 grid
    },

    windowIntact: {
        name: 'Window (Intact)',
        class: 'TacticalProp',
        maxHealth: 40,
        width: 50,
        height: 60,
        weightClass: null,
        color: 0x8B4513, // brown frame
        blocksBullets: true,
        onDestroy: 'createGlassShardHazard',
        glassShardRadius: 25,
        glassShardDamage: 3,
        glassShardDuration: 4000,
        layer: 'wall',
        spriteKey: 'interior5',
        spriteFrame: 7  // Bottom-center in 3x3 grid
    },

    windowBroken: {
        name: 'Window (Broken)',
        class: 'StructuralProp',
        maxHealth: 20,
        width: 50,
        height: 60,
        weightClass: null,
        color: 0x8B4513, // brown frame
        blocksBullets: false, // Already broken
        layer: 'wall',
        spriteKey: 'interior5',
        spriteFrame: 8  // Bottom-right in 3x3 grid
    }
};
