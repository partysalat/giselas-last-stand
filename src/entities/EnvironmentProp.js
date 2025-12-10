import { worldToScreen, calculateDepth, PIXELS_PER_WORLD_UNIT } from '../utils/CoordinateTransform.js';
import { checkPointVsAABB } from '../utils/CollisionUtils.js';

/**
 * Base class for all environment props
 * Provides core functionality for destructible objects in the saloon
 */
export class EnvironmentProp {
    constructor(scene, worldX, worldY, type) {
        this.scene = scene;
        this.type = type;
        this.alive = true;

        // World space coordinates (isometric 3D) - PRIMARY source of truth
        this.worldX = worldX;
        this.worldY = worldY;
        this.worldZ = 0; // Props sit on ground

        // Convert to screen coordinates for rendering
        const { screenX, screenY } = worldToScreen(worldX, worldY, this.worldZ);
        this.x = screenX;
        this.y = screenY;

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
        this.weightClass = config.weightClass;
        this.color = config.color;
        this.blocksBullets = config.blocksBullets !== undefined ? config.blocksBullets : true;
        this.layer = config.layer || 'ground';

        // World space dimensions (all gameplay uses these)
        this.worldWidth = config.worldWidth;
        this.worldDepth = config.worldDepth;
        this.worldHeight = config.worldHeight;
        this.jumpable = config.jumpable !== undefined ? config.jumpable : (this.worldHeight <= 0.6);

        // Collision uses world dimensions directly with optional scaling
        this.collisionScale = config.collisionScale || 0.7;
        this.footprintShape = config.footprintShape || 'rectangle';

        // Visual sprite scaling
        this.spriteScale = config.spriteScale || 1.0;

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

            // Scale sprite based on world dimensions
            // Sprites are 341x341, we scale based on world width/depth
            const spriteSize = 341;

            // Use the larger world dimension to determine base scale
            const maxWorldDimension = Math.max(this.worldWidth, this.worldDepth);

            // Convert world units to target pixel size
            // Base scale: 1 world unit = PIXELS_PER_WORLD_UNIT visual size
            const targetPixelSize = maxWorldDimension * PIXELS_PER_WORLD_UNIT;
            const baseScale = targetPixelSize / spriteSize;

            // Apply sprite scale multiplier from config
            const finalScale = baseScale * this.spriteScale;

            this.sprite.setScale(finalScale);
        } else {
            // Fallback: create rectangle using world dimensions
            // Convert to screen-space pixel size for rendering
            const pixelWidth = this.worldWidth * PIXELS_PER_WORLD_UNIT;
            const pixelHeight = this.worldDepth * PIXELS_PER_WORLD_UNIT;

            this.sprite = this.scene.add.rectangle(
                this.x,
                this.y,
                pixelWidth,
                pixelHeight,
                this.color
            );

            // Explosive barrels get red border
            if (this.explosionRadius > 0) {
                this.sprite.setStrokeStyle(5, 0xFF0000);
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
        if (!this.sprite) return;

        // Convert world position + offset to screen space
        const barOffsetWorldZ = (this.worldHeight * PIXELS_PER_WORLD_UNIT) + 10; // 10px above prop
        const { screenX, screenY } = worldToScreen(
            this.worldX,
            this.worldY,
            barOffsetWorldZ
        );

        // Health bar width based on world dimensions
        const barWidth = this.worldWidth * PIXELS_PER_WORLD_UNIT;
        const barHeight = 6;

        // Background bar
        this.healthBarBg = this.scene.add.rectangle(
            screenX,
            screenY,
            barWidth,
            barHeight,
            0x000000,
            0.5
        );
        this.healthBarBg.setDepth(calculateDepth(this.worldY, 50));
        this.healthBarBg.setVisible(false);

        // Foreground fill bar
        this.healthBarFill = this.scene.add.rectangle(
            screenX,
            screenY,
            barWidth,
            barHeight,
            0x00ff00,
            0.8
        );
        this.healthBarFill.setDepth(calculateDepth(this.worldY, 51));
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

        // Configure collision body using world dimensions
        // Convert world dimensions to screen-space pixel dimensions
        // Apply collision scale for looser movement feel
        const collisionWidth = this.worldWidth * PIXELS_PER_WORLD_UNIT * this.collisionScale;
        const collisionDepth = this.worldDepth * PIXELS_PER_WORLD_UNIT * this.collisionScale;

        // Use larger dimension for circular collision
        const collisionRadius = Math.max(collisionWidth, collisionDepth) / 2;

        if (this.footprintShape === 'circle') {
            this.sprite.body.setCircle(collisionRadius);

            // Center the circle
            const offsetX = (this.sprite.displayWidth - collisionRadius * 2) / 2;
            const offsetY = (this.sprite.displayHeight - collisionRadius * 2) / 2;
            this.sprite.body.setOffset(offsetX, offsetY);
        } else {
            // Rectangle collision
            this.sprite.body.setSize(collisionWidth, collisionDepth);

            // Center the rectangle
            const offsetX = (this.sprite.displayWidth - collisionWidth) / 2;
            const offsetY = (this.sprite.displayHeight - collisionDepth) / 2;
            this.sprite.body.setOffset(offsetX, offsetY);
        }

        this.sprite.body.immovable = (this.weightClass === 'heavy');

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
     * Check if an entity collides with this prop in 3D space
     * @param {number} entityWorldX - Entity's world X position
     * @param {number} entityWorldY - Entity's world Y position
     * @param {number} entityWorldZ - Entity's world Z position (bottom)
     * @param {number} entityRadius - Entity's collision radius
     * @param {number} entityHeight - Entity's physical height
     * @returns {boolean} True if collision detected
     */
    checkCollision3D(entityWorldX, entityWorldY, entityWorldZ, entityRadius, entityHeight) {
        // Don't collide with non-physical props
        if (!this.sprite.body) {
            return false;
        }

        // Create AABB for this prop using world dimensions
        const box = {
            x: this.worldX,
            y: this.worldY,
            z: this.worldZ,
            width: this.worldWidth,
            depth: this.worldDepth,
            height: this.worldHeight
        };

        return checkPointVsAABB(
            entityWorldX,
            entityWorldY,
            entityWorldZ,
            entityRadius,
            entityHeight,
            box
        );
    }

    /**
     * Check if entity can jump over this prop
     * @param {number} entityZ - Entity's current Z position (center or bottom)
     * @returns {boolean} True if entity is high enough to clear prop
     */
    canJumpOver(entityZ) {
        return this.jumpable && entityZ > this.worldHeight;
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
            this.worldWidth * PIXELS_PER_WORLD_UNIT,
            this.worldDepth * PIXELS_PER_WORLD_UNIT,
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
        if (this.healthBarFill && this.healthBarBg) {
            // Update fill width based on health percentage
            const barWidth = this.worldWidth * PIXELS_PER_WORLD_UNIT;
            this.healthBarFill.width = barWidth * healthPercent;

            // Recalculate screen position each frame (for moving props)
            const barOffsetWorldZ = (this.worldHeight * PIXELS_PER_WORLD_UNIT) + 10;
            const { screenX, screenY } = worldToScreen(
                this.worldX,
                this.worldY,
                barOffsetWorldZ
            );

            // Update positions
            this.healthBarBg.setPosition(screenX, screenY);
            this.healthBarFill.setPosition(
                screenX - (barWidth / 2) + (barWidth * healthPercent / 2),
                screenY
            );

            // Color based on health
            if (healthPercent > 0.6) {
                this.healthBarFill.setFillStyle(0x00ff00, 0.8); // Green
            } else if (healthPercent > 0.3) {
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

        // Create fire zone using WORLD coordinates
        this.scene.environmentManager.fireSystem.createFireZone(
            this.worldX,
            this.worldY,
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
        // Convert world position to screen position
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);

        // Convert explosion radius from world units to pixels
        const explosionRadiusPixels = this.explosionRadius * PIXELS_PER_WORLD_UNIT;

        // Visual explosion effect at SCREEN position
        const explosion = this.scene.add.circle(
            screenX,
            screenY,
            explosionRadiusPixels,
            0xFF4500,
            0.6
        );
        explosion.setDepth(25);

        // DEBUG: Show physics force radius (slightly larger, blue outline)
        const forceRadius = this.scene.add.circle(
            screenX,
            screenY,
            explosionRadiusPixels,
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

        // Damage entities in radius (use WORLD coordinates)
        this.scene.time.delayedCall(50, () => {
            this.damageInRadius(this.worldX, this.worldY, this.explosionRadius, this.explosionDamage);
        });

        // Phase 2: Apply explosion force to nearby props (use WORLD coordinates)
        if (this.scene.environmentManager && this.scene.environmentManager.physicsManager) {
            this.scene.environmentManager.physicsManager.applyExplosionForce(
                this.worldX,
                this.worldY,
                this.explosionRadius,
                600 // Force magnitude (increased for better visibility)
            );
        }
    }

    /**
     * Damage all entities in radius
     * @param {number} worldX - World X position of damage center
     * @param {number} worldY - World Y position of damage center
     * @param {number} radius - Damage radius
     * @param {number} damage - Damage amount
     */
    damageInRadius(worldX, worldY, radius, damage) {
        // Damage players (use WORLD coordinates)
        if (this.scene.playerManager) {
            this.scene.playerManager.getLivingPlayers().forEach(player => {
                const dx = player.worldX - worldX;
                const dy = player.worldY - worldY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    player.takeDamage(damage);
                }
            });
        }

        // Damage enemies (use WORLD coordinates)
        if (this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                if (!enemy.isAlive()) return;

                const dx = enemy.worldX - worldX;
                const dy = enemy.worldY - worldY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    enemy.takeDamage(damage);
                }
            });
        }

        // Damage other props via environment manager (pass WORLD coordinates)
        if (this.scene.environmentManager) {
            this.scene.environmentManager.damagePropsInRadius(worldX, worldY, radius, damage, this);
        }
    }

    /**
     * Check if bullet collides with this prop
     * @param {number} bulletWorldX - Bullet's world X position
     * @param {number} bulletWorldY - Bullet's world Y position
     */
    checkBulletCollision(bulletWorldX, bulletWorldY) {
        if (!this.alive || !this.blocksBullets) return false;

        // AABB collision check in WORLD space
        const halfWidth = this.worldWidth / 2;
        const halfDepth = this.worldDepth / 2;

        return (
            bulletWorldX >= this.worldX - halfWidth &&
            bulletWorldX <= this.worldX + halfWidth &&
            bulletWorldY >= this.worldY - halfDepth &&
            bulletWorldY <= this.worldY + halfDepth
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
        // Check both physicsData (for explosion forces) and sprite.body (for player pushing)
        let isMoving = false;

        if (this.physicsData) {
            const speed = Math.sqrt(
                this.physicsData.velocityX ** 2 +
                this.physicsData.velocityY ** 2
            );
            if (speed > 5) {
                isMoving = true;
            }
        }

        // Also check if sprite has a physics body that's moving (player pushing)
        if (this.sprite && this.sprite.body) {
            const bodySpeed = Math.sqrt(
                this.sprite.body.velocity.x ** 2 +
                this.sprite.body.velocity.y ** 2
            );
            if (bodySpeed > 5) {
                isMoving = true;
                // Update prop position to match sprite position when pushed by player
                this.x = this.sprite.x;
                this.y = this.sprite.y;
            }
        }

        if (isMoving) {
            this.updateDepth();
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
        const warning = this.scene.add.circle(this.x, this.y, (this.worldWidth * PIXELS_PER_WORLD_UNIT) / 2, 0xFF0000, 0);
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
        // Convert world position to screen position
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);

        // Convert darkenRadius from world units to pixels
        const radiusPixels = (this.darkenRadius || 3.0) * PIXELS_PER_WORLD_UNIT;

        console.log(`Creating dark zone at (${screenX}, ${screenY}), radius: ${radiusPixels}px`);

        // Create semi-transparent dark circle
        const darkZone = this.scene.add.circle(
            screenX,
            screenY,
            radiusPixels,
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
        this.createChandelierDebris(screenX, screenY);
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

            // Use WORLD coordinates for distance calculation
            const dx = enemy.worldX - this.worldX;
            const dy = enemy.worldY - this.worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // stunRadius is in world units
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
        // Convert world position to screen position
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);

        // Create expanding ring effect
        const ring = this.scene.add.circle(
            screenX,
            screenY,
            10,
            0xFFFF00,
            0
        );
        ring.setStrokeStyle(4, 0xFFFF00);
        ring.setDepth(25);

        // Convert radius from world units to pixels
        const radiusPixels = (this.stunRadius || this.activationRadius || 2.0) * PIXELS_PER_WORLD_UNIT;

        // Animate ring expanding
        this.scene.tweens.add({
            targets: ring,
            radius: radiusPixels,
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
            const offsetX = (Math.random() - 0.5) * this.worldWidth * PIXELS_PER_WORLD_UNIT;
            const offsetY = (Math.random() - 0.5) * this.worldDepth * PIXELS_PER_WORLD_UNIT;

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

        // Convert world position to screen position
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);

        // Convert flashRadius from world units to pixels
        const flashRadiusPixels = this.flashRadius * PIXELS_PER_WORLD_UNIT;

        // Create bright flash visual
        const flash = this.scene.add.circle(
            screenX,
            screenY,
            flashRadiusPixels,
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

        // Create small fire zone (fireSystem uses world coordinates)
        if (this.scene.environmentManager && this.scene.environmentManager.fireSystem) {
            this.scene.environmentManager.fireSystem.createFireZone(
                this.worldX,
                this.worldY,
                this.fireRadius,
                this.fireDuration,
                this.fireDamage
            );
        }

        // TODO: Implement actual blinding effect on enemies (would need enemy system support)
        console.log(`Flash effect would blind enemies in ${this.flashRadius} world units radius for ${this.flashDuration}ms`);
    }

    /**
     * Create glass shard hazard zone (mirror)
     */
    createGlassShardHazard() {
        console.log(`${this.name} destroyed - creating glass shard hazard!`);

        // Convert world position to screen position
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);

        // Convert glassShardRadius from world units to pixels
        const glassShardRadiusPixels = this.glassShardRadius * PIXELS_PER_WORLD_UNIT;

        // Create glass shard visual effect
        const numShards = 8 + Math.floor(Math.random() * 8);

        for (let i = 0; i < numShards; i++) {
            const angle = (Math.PI * 2 * i) / numShards + Math.random() * 0.3;
            const distance = Math.random() * glassShardRadiusPixels;
            const shardX = screenX + Math.cos(angle) * distance;
            const shardY = screenY + Math.sin(angle) * distance;

            const shard = this.scene.add.rectangle(
                screenX,
                screenY,
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
            screenX,
            screenY,
            glassShardRadiusPixels,
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

        // Convert world position to screen position
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);

        // Convert wetZoneRadius from world units to pixels
        const wetZoneRadiusPixels = this.wetZoneRadius * PIXELS_PER_WORLD_UNIT;

        // Create water spill visual
        const wetZone = this.scene.add.circle(
            screenX,
            screenY,
            wetZoneRadiusPixels,
            0x4682B4, // steel blue
            0.3
        );
        wetZone.setDepth(2);

        // Create water particle effect
        const numDroplets = 10 + Math.floor(Math.random() * 10);

        for (let i = 0; i < numDroplets; i++) {
            const angle = (Math.PI * 2 * i) / numDroplets + Math.random() * 0.5;
            const distance = Math.random() * wetZoneRadiusPixels;

            const droplet = this.scene.add.circle(
                screenX,
                screenY,
                3 + Math.random() * 4,
                0x87CEEB, // light blue
                0.6
            );
            droplet.setDepth(25);

            this.scene.tweens.add({
                targets: droplet,
                x: screenX + Math.cos(angle) * distance,
                y: screenY + Math.sin(angle) * distance,
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
            worldX: this.worldX,
            worldY: this.worldY,
            worldZ: this.worldZ,
            worldWidth: this.worldWidth,
            worldDepth: this.worldDepth,
            worldHeight: this.worldHeight
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
            const barWidth = this.worldWidth * PIXELS_PER_WORLD_UNIT;
            this.healthBarFill.width = barWidth;

            const barOffsetWorldZ = (this.worldHeight * PIXELS_PER_WORLD_UNIT) + 10;
            const { screenX, screenY } = worldToScreen(
                this.worldX,
                this.worldY,
                barOffsetWorldZ
            );
            this.healthBarFill.setPosition(screenX, screenY);
            this.healthBarFill.setFillStyle(0x00ff00, 0.8);
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
        // World dimensions (collision/gameplay)
        worldWidth: 2.4,        // 120px / 50 = 2.4 world units
        worldDepth: 1.0,        // 50px / 50 = 1.0 world units
        worldHeight: 0.8,       // Chest-height cover, blocks bullets
        jumpable: false,
        weightClass: 'heavy',
        color: 0x654321,
        blocksBullets: true,
        onDestroy: 'spawnBottleDebris',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 0,
        // Visual scaling (multiplier for sprite size)
        spriteScale: 2.0        // Make sprite 2x larger for visibility
    },

    piano: {
        name: 'Piano',
        class: 'DestructibleCover',
        maxHealth: 150,
        worldWidth: 1.8,        // 90px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 0.8,       // Chest-height cover
        jumpable: false,
        weightClass: 'heavy',
        color: 0x2F4F4F,
        blocksBullets: true,
        onDestroy: 'playDiscordantNotes',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 1,
        spriteScale: 2.0
    },

    heavyBookshelf: {
        name: 'Heavy Bookshelf',
        class: 'DestructibleCover',
        maxHealth: 180,
        worldWidth: 2.0,        // 100px / 50
        worldDepth: 0.8,        // 40px / 50
        worldHeight: 0.8,       // Chest-height
        jumpable: false,
        weightClass: 'heavy',
        color: 0x8B4513,
        blocksBullets: true,
        onDestroy: 'dropBooks',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 2,
        spriteScale: 2.0
    },

    flippedPokerTable: {
        name: 'Flipped Poker Table',
        class: 'DestructibleCover',
        maxHealth: 120,
        worldWidth: 2.0,        // 100px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 0.8,       // Chest-height
        jumpable: false,
        weightClass: 'heavy',
        color: 0x228B22,
        blocksBullets: true,
        interactive: true,
        activationRadius: 1.0,  // World units (50px / 50)
        onActivate: 'flipTable',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 3,
        spriteScale: 2.0
    },

    safe: {
        name: 'Safe',
        class: 'DestructibleCover',
        maxHealth: 250,
        worldWidth: 1.0,        // 50px / 50
        worldDepth: 1.0,        // 50px / 50
        worldHeight: 0.8,       // Chest-height
        jumpable: false,
        weightClass: 'heavy',
        color: 0x708090,
        blocksBullets: true,
        onDestroy: 'dropCoins',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 4,
        spriteScale: 2.0
    },

    // Light Cover
    cardTable: {
        name: 'Card Table',
        class: 'DestructibleCover',
        maxHealth: 60,
        worldWidth: 1.6,        // 80px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 0.8,       // Chest-height
        jumpable: false,
        weightClass: 'light',
        color: 0x006400,
        blocksBullets: true,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 3,
        spriteScale: 2.0
    },

    woodenChair: {
        name: 'Wooden Chair',
        class: 'PhysicsProp',
        maxHealth: 30,
        worldWidth: 0.6,        // 30px / 50
        worldDepth: 0.6,        // 30px / 50
        worldHeight: 0.5,       // Low enough to jump over
        jumpable: true,
        weightClass: 'light',
        color: 0x8B4513,
        blocksBullets: true,
        impactDamage: 5,
        impactSpeed: 100,
        friction: 0.92,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 0,
        spriteScale: 3.5        // Small props get bigger multiplier
    },

    barrel: {
        name: 'Barrel',
        class: 'PhysicsProp',
        maxHealth: 50,
        worldWidth: 0.8,        // 40px / 50
        worldDepth: 0.8,        // 40px / 50
        worldHeight: 0.6,       // Can jump over
        jumpable: true,
        weightClass: 'medium',
        color: 0xA0522D,
        blocksBullets: true,
        impactDamage: 10,
        impactSpeed: 80,
        friction: 0.90,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 1,
        spriteScale: 2.5
    },

    barStool: {
        name: 'Bar Stool',
        class: 'PhysicsProp',
        maxHealth: 25,
        worldWidth: 0.4,        // 20px / 50
        worldDepth: 0.4,        // 20px / 50
        worldHeight: 0.5,       // Jumpable
        jumpable: true,
        weightClass: 'light',
        color: 0xA0522D,
        blocksBullets: true,
        impactDamage: 3,
        impactSpeed: 120,
        friction: 0.98,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 1,
        spriteScale: 3.5
    },

    smallCrate: {
        name: 'Small Crate',
        class: 'PhysicsProp',
        maxHealth: 40,
        worldWidth: 0.7,        // 35px / 50
        worldDepth: 0.7,        // 35px / 50
        worldHeight: 0.5,       // Jumpable
        jumpable: true,
        weightClass: 'light',
        color: 0xDEB887,
        blocksBullets: true,
        impactDamage: 3,
        impactSpeed: 100,
        friction: 0.90,
        onDestroy: 'spawnSplinters',
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 2,
        spriteScale: 3.5
    },

    // Hazard Props
    oilLamp: {
        name: 'Oil Lamp',
        class: 'HazardProp',
        maxHealth: 20,
        worldWidth: 0.3,        // 15px / 50
        worldDepth: 0.3,        // 15px / 50
        worldHeight: 0.5,       // Jumpable
        jumpable: true,
        weightClass: 'light',
        color: 0xFFD700,
        blocksBullets: true,
        onDestroy: 'createFireZone',
        fireRadius: 0.8,        // 40px / 50
        fireDuration: 8000,
        fireDamage: 5,
        layer: 'table',
        spriteKey: 'interior3',
        spriteFrame: 1,
        spriteScale: 3.5
    },

    // Legacy explosive barrel for compatibility
    explosiveBarrel: {
        name: 'Explosive Barrel',
        class: 'HazardProp',
        maxHealth: 50,
        worldWidth: 0.8,        // 40px / 50
        worldDepth: 0.8,        // 40px / 50
        worldHeight: 0.6,       // Jumpable
        weightClass: 'medium',
        color: 0x8B4513,
        blocksBullets: true,
        explosionRadius: 4.0,   // 200px / 50
        explosionDamage: 20,
        layer: 'ground',
        spriteScale: 2.5
    },

    whiskeyBarrel: {
        name: 'Whiskey Barrel',
        class: 'HazardProp',
        maxHealth: 50,
        worldWidth: 0.8,        // 40px / 50
        worldDepth: 0.8,        // 40px / 50
        worldHeight: 0.6,       // Jumpable
        weightClass: 'medium',
        color: 0x8B2500,
        blocksBullets: true,
        explosionRadius: 1.2,   // 60px / 50
        explosionDamage: 20,
        onDestroy: 'createLiquidTrailFire',
        fireRadius: 1.2,        // 60px / 50
        fireDuration: 10000,
        fireDamage: 5,
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 3,
        spriteScale: 2.5
    },

    dynamiteCrate: {
        name: 'Dynamite Crate',
        class: 'HazardProp',
        maxHealth: 80,
        worldWidth: 1.0,        // 50px / 50
        worldDepth: 1.0,        // 50px / 50
        worldHeight: 0.6,       // Jumpable
        weightClass: 'medium',
        color: 0xD2691E,
        blocksBullets: true,
        explosionRadius: 2.0,   // 100px / 50
        explosionDamage: 30,
        onDestroy: 'triggerChainExplosions',
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 4,
        spriteScale: 2.5
    },

    gasLantern: {
        name: 'Gas Lantern',
        class: 'HazardProp',
        maxHealth: 30,
        worldWidth: 0.4,        // 20px / 50
        worldDepth: 0.4,        // 20px / 50
        worldHeight: 0.5,       // Jumpable
        weightClass: 'light',
        color: 0xFFFFE0,
        blocksBullets: true,
        onDestroy: 'createBlindingFlash',
        fireRadius: 0.6,        // 30px / 50
        fireDuration: 2000,
        fireDamage: 5,
        flashRadius: 3.0,       // 150px / 50
        flashDuration: 1000,
        layer: 'table',
        spriteKey: 'interior3',
        spriteFrame: 2,
        spriteScale: 3.5
    },

    // Phase 4: Tactical Props

    // Stage Lights - shoot to drop and deal damage
    stageLights: {
        name: 'Stage Lights',
        class: 'TacticalProp',
        maxHealth: 40,
        worldWidth: 0.6,        // 30px / 50
        worldDepth: 0.8,        // 40px / 50
        worldHeight: 1.2,       // Ceiling-mounted, tall
        weightClass: null,
        color: 0xFFFF00,
        blocksBullets: true,
        onDestroy: 'fallAndDealDamage',
        fallDamage: 15,
        fallRadius: 0.6,        // 30px / 50
        layer: 'ceiling',
        spriteKey: 'interior4',
        spriteFrame: 7,
        spriteScale: 2.0
    },

    // Bell Rope - activate to stun enemies
    bellRope: {
        name: 'Bell Rope',
        class: 'TacticalProp',
        maxHealth: 30,
        worldWidth: 0.2,        // 10px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 1.5,       // Very tall, ceiling-mounted
        weightClass: null,
        color: 0xCD853F,
        blocksBullets: true,
        interactive: true,
        activationRadius: 1.0,  // 50px / 50
        onActivate: 'stunEnemies',
        stunRadius: 12.0,       // 600px / 50
        stunDuration: 5000,
        maxUses: 3,
        cooldown: 2000,
        layer: 'ceiling',
        spriteKey: 'interior4',
        spriteFrame: 1,
        spriteScale: 2.0
    },

    swingingDoors: {
        name: 'Swinging Doors',
        class: 'TacticalProp',
        maxHealth: 60,
        worldWidth: 1.6,        // 80px / 50
        worldDepth: 2.0,        // 100px / 50
        worldHeight: 1.2,       // Tall obstacle
        weightClass: null,
        color: 0x8B4513,
        blocksBullets: true,
        onDestroy: 'autoSwingClosed',
        knockbackForce: 20,
        layer: 'ground',
        spriteKey: 'interior4',
        spriteFrame: 0,
        spriteScale: 2.0
    },

    stageCurtain: {
        name: 'Stage Curtain',
        class: 'TacticalProp',
        maxHealth: 40,
        worldWidth: 2.0,        // 100px / 50
        worldDepth: 2.4,        // 120px / 50
        worldHeight: 1.5,       // Very tall
        weightClass: null,
        color: 0x8B0000,
        blocksBullets: false,
        flammable: true,
        fireSpreadMultiplier: 2.0,
        layer: 'wall',
        spriteKey: 'interior4',
        spriteFrame: 2,
        spriteScale: 2.0
    },

    mirror: {
        name: 'Mirror',
        class: 'TacticalProp',
        maxHealth: 50,
        worldWidth: 0.8,        // 40px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 1.2,       // Tall wall-mounted
        weightClass: null,
        color: 0xC0C0C0,
        blocksBullets: true,
        onDestroy: 'createGlassShardHazard',
        glassShardRadius: 0.5,  // 25px / 50
        glassShardDamage: 3,
        glassShardDuration: 4000,
        layer: 'wall',
        spriteKey: 'interior4',
        spriteFrame: 5,
        spriteScale: 2.0
    },

    // Phase 5: Chandelier - dynamic prop with falling system
    chandelier: {
        name: 'Chandelier',
        class: 'DynamicProp',
        maxHealth: 100,
        worldWidth: 1.2,        // 60px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 1.5,       // Ceiling-mounted
        weightClass: 'heavy',
        color: 0xFFD700,
        blocksBullets: false,
        fallDamage: 25,
        fallRadius: 1.0,        // 50px / 50
        darkenRadius: 3.0,      // 150px / 50
        layer: 'ceiling',
        spriteKey: 'interior4',
        spriteFrame: 4,
        spriteScale: 2.0
    },

    // Phase 6: Boss Integration Props

    // Support Beam - structural prop that can be destroyed by bosses
    supportBeam: {
        name: 'Support Beam',
        class: 'StructuralProp',
        maxHealth: 300,
        worldWidth: 0.6,        // 30px / 50
        worldDepth: 3.0,        // 150px / 50
        worldHeight: 2.0,       // Very tall structural element
        weightClass: null,
        color: 0x8B4513,
        blocksBullets: true,
        onDestroy: 'stageTilt',
        layer: 'structure',
        spriteKey: 'interior5',
        spriteFrame: 1,
        spriteScale: 2.0
    },

    // Trapdoor - opens from explosions/boss attacks
    trapdoor: {
        name: 'Trapdoor',
        class: 'SpecialProp',
        maxHealth: Infinity,
        worldWidth: 1.2,        // 60px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 0.0,       // Floor level
        weightClass: null,
        color: 0x654321,
        blocksBullets: false,
        interactive: false,
        layer: 'floor',
        spriteKey: 'interior5',
        spriteFrame: 2,
        spriteScale: 2.0
    },

    // Phase 7: Additional Special Props

    waterTrough: {
        name: 'Water Trough',
        class: 'SpecialProp',
        maxHealth: 100,
        worldWidth: 1.4,        // 70px / 50
        worldDepth: 0.8,        // 40px / 50
        worldHeight: 0.8,       // Chest-height
        weightClass: 'heavy',
        color: 0x4682B4,
        blocksBullets: true,
        onDestroy: 'spillWater',
        wetZoneRadius: 1.6,     // 80px / 50
        wetZoneDuration: 20000,
        electricalMultiplier: 1.5,
        layer: 'ground',
        spriteKey: 'interior5',
        spriteFrame: 0,
        spriteScale: 2.0
    },

    // Additional props from interior1 sprite bundle
    woodenChest: {
        name: 'Wooden Chest',
        class: 'DestructibleCover',
        maxHealth: 160,
        worldWidth: 1.6,        // 80px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 0.8,       // Chest-height
        weightClass: 'heavy',
        color: 0x8B4513,
        blocksBullets: true,
        onDestroy: 'dropCoins',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 6,
        spriteScale: 2.0
    },

    cabinet: {
        name: 'Cabinet',
        class: 'DestructibleCover',
        maxHealth: 140,
        worldWidth: 1.4,        // 70px / 50
        worldDepth: 1.6,        // 80px / 50
        worldHeight: 1.2,       // Tall obstacle
        weightClass: 'heavy',
        color: 0x8B4513,
        blocksBullets: true,
        onDestroy: 'spawnBottleDebris',
        layer: 'ground',
        spriteKey: 'interior1',
        spriteFrame: 8,
        spriteScale: 2.0
    },

    // Additional props from interior2 sprite bundle
    standardBarrel: {
        name: 'Standard Barrel',
        class: 'PhysicsProp',
        maxHealth: 50,
        worldWidth: 0.8,        // 40px / 50
        worldDepth: 0.8,        // 40px / 50
        worldHeight: 0.6,       // Jumpable
        weightClass: 'medium',
        color: 0xA0522D,
        blocksBullets: true,
        impactDamage: 10,
        impactSpeed: 80,
        friction: 0.88,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 4,
        spriteScale: 2.5
    },

    woodenBench: {
        name: 'Wooden Bench',
        class: 'PhysicsProp',
        maxHealth: 50,
        worldWidth: 1.4,        // 70px / 50
        worldDepth: 0.6,        // 30px / 50
        worldHeight: 0.5,       // Jumpable
        weightClass: 'medium',
        color: 0x8B4513,
        blocksBullets: true,
        impactDamage: 8,
        impactSpeed: 90,
        friction: 0.90,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 5,
        spriteScale: 2.5
    },

    smallTable: {
        name: 'Small Table',
        class: 'PhysicsProp',
        maxHealth: 40,
        worldWidth: 0.8,        // 40px / 50
        worldDepth: 0.8,        // 40px / 50
        worldHeight: 0.8,       // Chest-height
        weightClass: 'light',
        color: 0x8B4513,
        blocksBullets: true,
        impactDamage: 5,
        impactSpeed: 100,
        friction: 0.92,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 6,
        spriteScale: 2.5
    },

    woodenStool: {
        name: 'Wooden Stool',
        class: 'PhysicsProp',
        maxHealth: 20,
        worldWidth: 0.5,        // 25px / 50
        worldDepth: 0.5,        // 25px / 50
        worldHeight: 0.5,       // Jumpable
        weightClass: 'light',
        color: 0x8B4513,
        blocksBullets: true,
        impactDamage: 3,
        impactSpeed: 120,
        friction: 0.95,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 7,
        spriteScale: 3.5
    },

    ammunitionBox: {
        name: 'Ammunition Box',
        class: 'DestructibleCover',
        maxHealth: 60,
        worldWidth: 0.7,        // 35px / 50
        worldDepth: 0.6,        // 30px / 50
        worldHeight: 0.6,       // Jumpable
        weightClass: 'medium',
        color: 0x808000,
        blocksBullets: true,
        layer: 'ground',
        spriteKey: 'interior2',
        spriteFrame: 8,
        spriteScale: 2.5
    },

    // Additional props from interior3 sprite bundle (hazards)
    hangingOilLamp: {
        name: 'Hanging Oil Lamp',
        class: 'HazardProp',
        maxHealth: 20,
        worldWidth: 0.3,        // 15px / 50
        worldDepth: 0.6,        // 30px / 50 (taller due to chain)
        worldHeight: 1.2,       // Ceiling-mounted
        weightClass: null,
        color: 0xFFD700,
        blocksBullets: false,
        onDestroy: 'createFireZone',
        fireRadius: 0.8,        // 40px / 50
        fireDuration: 8000,
        fireDamage: 5,
        layer: 'ceiling',
        spriteKey: 'interior3',
        spriteFrame: 0,
        spriteScale: 3.5
    },

    gunpowderKeg: {
        name: 'Gunpowder Keg',
        class: 'HazardProp',
        maxHealth: 40,
        worldWidth: 0.7,        // 35px / 50
        worldDepth: 0.7,        // 35px / 50
        worldHeight: 0.6,       // Jumpable
        weightClass: 'medium',
        color: 0x2F4F4F,
        blocksBullets: true,
        explosionRadius: 1.6,   // 80px / 50
        explosionDamage: 35,
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 5,
        spriteScale: 2.5
    },

    fireBrazier: {
        name: 'Fire Brazier',
        class: 'HazardProp',
        maxHealth: 60,
        worldWidth: 0.6,        // 30px / 50
        worldDepth: 0.6,        // 30px / 50
        worldHeight: 0.8,       // Chest-height
        weightClass: 'medium',
        color: 0xFF4500,
        blocksBullets: true,
        onDestroy: 'createFireZone',
        fireRadius: 1.0,        // 50px / 50
        fireDuration: 12000,
        fireDamage: 8,
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 6,
        spriteScale: 2.5
    },

    molotovBottle: {
        name: 'Molotov Bottle',
        class: 'HazardProp',
        maxHealth: 10,
        worldWidth: 0.3,        // 15px / 50
        worldDepth: 0.4,        // 20px / 50
        worldHeight: 0.5,       // Jumpable
        weightClass: 'light',
        color: 0x8B4513,
        blocksBullets: false,
        onDestroy: 'createFireZone',
        fireRadius: 0.9,        // 45px / 50
        fireDuration: 6000,
        fireDamage: 6,
        layer: 'table',
        spriteKey: 'interior3',
        spriteFrame: 7,
        spriteScale: 3.5
    },

    keroseneCanister: {
        name: 'Kerosene Canister',
        class: 'HazardProp',
        maxHealth: 50,
        worldWidth: 0.6,        // 30px / 50
        worldDepth: 0.7,        // 35px / 50
        worldHeight: 0.6,       // Jumpable
        weightClass: 'medium',
        color: 0xFF4500,
        blocksBullets: true,
        explosionRadius: 1.4,   // 70px / 50
        explosionDamage: 25,
        onDestroy: 'createLiquidTrailFire',
        fireRadius: 1.1,        // 55px / 50
        fireDuration: 10000,
        fireDamage: 7,
        layer: 'ground',
        spriteKey: 'interior3',
        spriteFrame: 8,
        spriteScale: 2.5
    },

    // Additional props from interior4 sprite bundle (tactical)
    ornateMirror: {
        name: 'Ornate Mirror',
        class: 'TacticalProp',
        maxHealth: 60,
        worldWidth: 0.8,        // 40px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 1.2,       // Wall-mounted
        weightClass: null,
        color: 0xC0C0C0,
        blocksBullets: true,
        onDestroy: 'createGlassShardHazard',
        glassShardRadius: 0.6,  // 30px / 50
        glassShardDamage: 4,
        glassShardDuration: 5000,
        layer: 'wall',
        spriteKey: 'interior4',
        spriteFrame: 3,
        spriteScale: 2.0
    },

    wantedPosterBoard: {
        name: 'Wanted Poster Board',
        class: 'TacticalProp',
        maxHealth: 80,
        worldWidth: 1.0,        // 50px / 50
        worldDepth: 1.4,        // 70px / 50
        worldHeight: 1.2,       // Wall-mounted
        weightClass: null,
        color: 0x8B4513,
        blocksBullets: true,
        layer: 'wall',
        spriteKey: 'interior4',
        spriteFrame: 6,
        spriteScale: 2.0
    },

    spittoon: {
        name: 'Spittoon',
        class: 'PhysicsProp',
        maxHealth: 40,
        worldWidth: 0.5,        // 25px / 50
        worldDepth: 0.5,        // 25px / 50
        worldHeight: 0.5,       // Jumpable
        weightClass: 'light',
        color: 0xFFD700,
        blocksBullets: true,
        impactDamage: 5,
        impactSpeed: 110,
        friction: 0.85,
        layer: 'ground',
        spriteKey: 'interior4',
        spriteFrame: 8,
        spriteScale: 3.5
    },

    // Additional props from interior5 sprite bundle (Bundle 5: Special Props & Structural)

    trapdoorOpen: {
        name: 'Trapdoor (Open)',
        class: 'SpecialProp',
        maxHealth: Infinity,
        worldWidth: 1.2,        // 60px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 0.0,       // Floor level
        weightClass: null,
        color: 0x654321,
        blocksBullets: false,
        interactive: false,
        layer: 'floor',
        spriteKey: 'interior5',
        spriteFrame: 3,
        spriteScale: 2.0
    },

    stagePlatform: {
        name: 'Stage Platform',
        class: 'StructuralProp',
        maxHealth: 200,
        worldWidth: 1.6,        // 80px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 0.8,       // Chest-height platform
        weightClass: 'heavy',
        color: 0x8B4513,
        blocksBullets: true,
        layer: 'ground',
        spriteKey: 'interior5',
        spriteFrame: 4,
        spriteScale: 2.0
    },

    hitchingPost: {
        name: 'Hitching Post',
        class: 'StructuralProp',
        maxHealth: 120,
        worldWidth: 0.4,        // 20px / 50
        worldDepth: 1.0,        // 50px / 50
        worldHeight: 1.2,       // Tall obstacle
        weightClass: 'heavy',
        color: 0x8B4513,
        blocksBullets: true,
        layer: 'ground',
        spriteKey: 'interior5',
        spriteFrame: 5,
        spriteScale: 2.0
    },

    balconyRailing: {
        name: 'Balcony Railing',
        class: 'StructuralProp',
        maxHealth: 100,
        worldWidth: 2.0,        // 100px / 50
        worldDepth: 0.6,        // 30px / 50
        worldHeight: 0.8,       // Chest-height
        weightClass: 'heavy',
        color: 0x8B4513,
        blocksBullets: true,
        layer: 'wall',
        spriteKey: 'interior5',
        spriteFrame: 6,
        spriteScale: 2.0
    },

    windowIntact: {
        name: 'Window (Intact)',
        class: 'TacticalProp',
        maxHealth: 40,
        worldWidth: 1.0,        // 50px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 1.2,       // Wall-mounted
        weightClass: null,
        color: 0x8B4513,
        blocksBullets: true,
        onDestroy: 'createGlassShardHazard',
        glassShardRadius: 0.5,  // 25px / 50
        glassShardDamage: 3,
        glassShardDuration: 4000,
        layer: 'wall',
        spriteKey: 'interior5',
        spriteFrame: 7,
        spriteScale: 2.0
    },

    windowBroken: {
        name: 'Window (Broken)',
        class: 'StructuralProp',
        maxHealth: 20,
        worldWidth: 1.0,        // 50px / 50
        worldDepth: 1.2,        // 60px / 50
        worldHeight: 1.2,       // Wall-mounted
        weightClass: null,
        color: 0x8B4513,
        blocksBullets: false,
        layer: 'wall',
        spriteKey: 'interior5',
        spriteFrame: 8,
        spriteScale: 2.0
    }
};
