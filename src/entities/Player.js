import { worldToScreen, screenToWorld, calculateDepth } from '../utils/CoordinateTransform.js';
import { ISOMETRIC_CONFIG } from '../config.js';

export class Player {
    constructor(scene, worldX, worldY, worldZ = 0, color = 'red') {
        this.scene = scene;
        this.color = color;

        // World space coordinates (isometric 3D)
        this.worldX = worldX;
        this.worldY = worldY;
        this.worldZ = worldZ;

        // Convert to screen space for sprite creation
        const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ);

        // For red color, use directional sprites; others use old system
        if (color === 'red') {
            this.sprite = scene.add.sprite(screenX, screenY, `gisela-${color}-down`);
            this.currentDirection = 'down'; // Track current facing direction
            this.useDirectionalSprites = true;
        } else {
            this.sprite = scene.add.sprite(screenX, screenY, `gisela-${color}`);
            this.sprite.play(`gisela-${color}-idle`);
            this.useDirectionalSprites = false;
        }

        // Scale down to appropriate size
        this.sprite.setScale(0.5);

        // Create shadow sprite at ground level
        this.shadow = scene.add.ellipse(screenX, screenY, 30, 15, 0x000000, 0.3);
        this.shadow.setDepth(1); // Below player but above floor

        // Set depth based on world Y position for isometric sorting
        this.sprite.setDepth(calculateDepth(this.worldY, 10));

        scene.physics.add.existing(this.sprite);

        // Physics body is only used for collision detection, not movement
        this.sprite.body.setCircle(ISOMETRIC_CONFIG.PLAYER_RADIUS);
        this.sprite.body.setOffset(28, 28); // Center the collision circle
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setImmovable(true); // Prevents physics from moving the body

        // Player properties
        this.speed = 5.0; // World units per second
        this.speedMultiplier = 1.0;
        this.health = 100;
        this.maxHealth = 100;

        // Physical dimensions
        this.height = ISOMETRIC_CONFIG.PLAYER_HEIGHT;
        this.radius = ISOMETRIC_CONFIG.PLAYER_RADIUS;

        // Jumping properties
        this.jumpVelocity = 0;
        this.gravity = ISOMETRIC_CONFIG.GRAVITY;
        this.isJumping = false;
        this.isInAir = false;
        this.maxJumpHeight = ISOMETRIC_CONFIG.MAX_JUMP_HEIGHT;
        this.jumpPressed = false; // Track jump button state

        // Multiplayer properties
        this.playerName = 'Player 1'; // Will be set by PlayerManager
        this.playerIndex = 0; // Will be set by PlayerManager
        this.isDead = false;

        // Shooting properties
        this.bullets = [];
        this.fireRate = 200; // milliseconds between shots
        this.nextFire = 0;

        // Damage cooldown properties
        this.lastHitTime = 0;
        this.hitCooldown = 1000; // milliseconds between damage (1 second)

        // Buff system
        this.activeBuff = null;
        this.buffEndTime = 0;
        this.buffAura = null;
        this.damageRampMultiplier = 1.0;
        this.rampShotsFired = 0;

        // Cocktail inventory system
        this.storedCocktail = null;  // { type: 'mojito', config: {...} }
        this.storedCocktailIndicator = null;  // Visual sprite above player
        this.storedCocktailGlow = null;

        // Shooting properties for buff calculations
        this.shootCooldown = this.fireRate;
        this.bulletDamage = 10;
    }

    update(keys, delta) {
        // Calculate movement vector in screen space
        let screenVelX = 0;
        let screenVelY = 0;

        if (keys.W.isDown) {
            screenVelY -= 1; // Move up on screen (north)
        }
        if (keys.S.isDown) {
            screenVelY += 1; // Move down on screen (south)
        }
        if (keys.A.isDown) {
            screenVelX -= 1; // Move left on screen (west)
        }
        if (keys.D.isDown) {
            screenVelX += 1; // Move right on screen (east)
        }

        // Rotate 90 degrees counterclockwise for proper isometric feel
        // After rotation: W goes left, D goes up, S goes right, A goes down
        const rotatedX = screenVelY;  // Up becomes left
        const rotatedY = -screenVelX; // Right becomes up

        // Convert rotated screen-space to world-space for isometric
        let worldVelX = rotatedX - rotatedY;
        let worldVelY = rotatedX + rotatedY;

        // Normalize diagonal movement
        if (worldVelX !== 0 && worldVelY !== 0) {
            const length = Math.sqrt(worldVelX * worldVelX + worldVelY * worldVelY);
            worldVelX /= length;
            worldVelY /= length;
        }

        // Apply speed multiplier (for ink cloud slow effect)
        const effectiveSpeed = this.speed * this.speedMultiplier;

        // Update world position
        const deltaSeconds = delta / 1000;
        this.worldX += worldVelX * effectiveSpeed * deltaSeconds;
        this.worldY += worldVelY * effectiveSpeed * deltaSeconds;

        // Update sprite direction for red Gisela
        if (this.useDirectionalSprites && (worldVelX !== 0 || worldVelY !== 0)) {
            this.updateDirection(worldVelX, worldVelY);
        }

        // Handle jumping physics
        this.updateJumping(keys, deltaSeconds);

        // Convert world position to screen position and update sprite
        const { screenX, screenY } = worldToScreen(this.worldX, this.worldY, this.worldZ);
        this.sprite.setPosition(screenX, screenY);

        // Update shadow at ground level (worldZ = 0)
        const shadowPos = worldToScreen(this.worldX, this.worldY, 0);
        this.shadow.setPosition(shadowPos.screenX, shadowPos.screenY);

        // Update depth for proper isometric sorting
        this.sprite.setDepth(calculateDepth(this.worldY, 10));

        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            if (bullet.isAlive()) {
                bullet.update(delta);
                return true;
            }
            return false;
        });

        // Update buff aura position
        if (this.buffAura) {
            this.buffAura.setPosition(this.sprite.x, this.sprite.y);
        }

        // Update stored cocktail indicator position
        if (this.storedCocktailIndicator) {
            this.storedCocktailIndicator.setPosition(this.sprite.x, this.sprite.y - 40);
        }
        if (this.storedCocktailGlow) {
            this.storedCocktailGlow.setPosition(this.sprite.x, this.sprite.y);
        }

        // Check buff expiration
        this.getActiveBuff();
    }

    updateJumping(keys, deltaSeconds) {
        // Handle jump input (SPACE bar)
        const jumpKeyDown = keys.SPACE && keys.SPACE.isDown;

        // Start jump when pressing SPACE while on ground
        if (jumpKeyDown && !this.jumpPressed && !this.isJumping && this.worldZ === 0) {
            this.jumpVelocity = ISOMETRIC_CONFIG.JUMP_VELOCITY;
            this.isJumping = true;
            this.isInAir = true;

            // Apply initial jump velocity immediately
            this.worldZ += this.jumpVelocity * deltaSeconds;

            this.jumpPressed = jumpKeyDown;
            return;
        }

        this.jumpPressed = jumpKeyDown;

        // Apply gravity and update height (only if already in air)
        if (this.isInAir || this.worldZ > 0) {
            this.jumpVelocity += this.gravity * deltaSeconds;
            this.worldZ += this.jumpVelocity * deltaSeconds;

            // Land on ground
            if (this.worldZ <= 0) {
                this.worldZ = 0;
                this.jumpVelocity = 0;
                this.isJumping = false;
                this.isInAir = false;
            }
        }
    }

    shoot(targetEnemy, currentTime) {
        // Check if we have a target
        if (!targetEnemy) {
            return;
        }

        // Validate target based on type
        if (targetEnemy.type === 'tentacle') {
            const enemy = targetEnemy.enemy;
            const tentData = enemy.tentacles ? enemy.tentacles[targetEnemy.tentacleIndex] : null;
            if (!enemy || !enemy.isAlive() || !tentData || !tentData.alive) {
                return;
            }
        } else if (targetEnemy.type === 'enemy') {
            if (!targetEnemy.enemy || !targetEnemy.enemy.isAlive()) {
                return;
            }
        } else if (targetEnemy.type === 'prop') {
            if (!targetEnemy.prop || !targetEnemy.prop.isAlive()) {
                return;
            }
        } else {
            // Legacy format: plain enemy object
            if (!targetEnemy.isAlive || !targetEnemy.isAlive()) {
                return;
            }
        }

        // Check cooldown (modified by rapid_fire buff)
        const activeBuff = this.getActiveBuff();
        let cooldown = this.shootCooldown;

        if (activeBuff === 'rapid_fire') {
            cooldown = this.shootCooldown / 2;
        }

        if (currentTime < this.nextFire) {
            return;
        }

        this.nextFire = currentTime + cooldown;

        // Calculate angle to target based on type
        let targetScreenX, targetScreenY;

        if (targetEnemy.type === 'tentacle') {
            const enemy = targetEnemy.enemy;
            const tentSprite = enemy.tentacleSprites ? enemy.tentacleSprites[targetEnemy.tentacleIndex] : null;
            if (tentSprite) {
                targetScreenX = tentSprite.x;
                targetScreenY = tentSprite.y;
            } else {
                return; // No sprite available
            }
        } else if (targetEnemy.type === 'enemy') {
            targetScreenX = targetEnemy.enemy.getSprite().x;
            targetScreenY = targetEnemy.enemy.getSprite().y;
        } else if (targetEnemy.type === 'prop') {
            targetScreenX = targetEnemy.prop.x;
            targetScreenY = targetEnemy.prop.y;
        } else {
            // Legacy format: plain enemy object
            targetScreenX = targetEnemy.getSprite().x;
            targetScreenY = targetEnemy.getSprite().y;
        }

        // Convert target from screen space to world space (assuming ground level)
        const targetWorld = screenToWorld(targetScreenX, targetScreenY, 0);

        // Calculate angle in world space
        const baseAngle = Math.atan2(
            targetWorld.worldY - this.worldY,
            targetWorld.worldX - this.worldX
        );

        // Calculate damage with buffs
        let damage = this.bulletDamage;

        if (activeBuff === 'heavy_hitter') {
            damage *= 2;
        } else if (activeBuff === 'damage_ramp') {
            this.rampShotsFired++;
            this.damageRampMultiplier = 1.0 + (this.rampShotsFired * 0.05);
            damage *= this.damageRampMultiplier;
        } else if (activeBuff === 'critical') {
            if (Math.random() < 0.5) {
                damage *= 3;
            }
        }

        // Determine number of bullets and angles based on buff
        const bulletAngles = [];

        if (activeBuff === 'spread_shot') {
            // 5 bullets in fan pattern
            for (let i = -2; i <= 2; i++) {
                bulletAngles.push(baseAngle + (i * Math.PI / 12));
            }
        } else {
            // Single bullet
            bulletAngles.push(baseAngle);
        }

        // Create bullets at player's world position with chest height
        bulletAngles.forEach(angle => {
            const bullet = new this.scene.Bullet(
                this.scene,
                this.worldX,
                this.worldY,
                this.worldZ + 20, // Spawn at chest height
                angle,
                damage
            );

            // Mark piercing bullets
            if (activeBuff === 'piercing') {
                bullet.piercing = true;
            }

            this.bullets.push(bullet);
        });
    }

    getX() {
        return this.sprite.x;
    }

    getY() {
        return this.sprite.y;
    }

    getBody() {
        return this.sprite.body;
    }

    takeDamage(amount) {
        const currentTime = this.scene.time.now;

        // Check if still in cooldown
        if (currentTime < this.lastHitTime + this.hitCooldown) {
            return this.health; // No damage taken
        }

        this.health -= amount;
        if (this.health < 0) this.health = 0;
        this.lastHitTime = currentTime;

        // Flash sprite
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
        });

        // Check for death
        if (this.health <= 0 && !this.isDead) {
            if (this.scene.playerManager) {
                this.scene.playerManager.handlePlayerDeath(this);
            }
        }

        return this.health;
    }

    heal(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.health + amount, this.maxHealth);
        const actualHealing = this.health - oldHealth;
        return actualHealing;
    }

    isDead() {
        return this.health <= 0;
    }

    applyBuff(cocktailConfig) {
        // Remove old buff visuals if any
        if (this.buffAura) {
            this.buffAura.destroy();
        }

        // Set new buff
        this.activeBuff = cocktailConfig.effect;
        this.buffEndTime = Date.now() + cocktailConfig.duration;

        // Reset damage ramp if applicable
        if (this.activeBuff === 'damage_ramp') {
            this.damageRampMultiplier = 1.0;
            this.rampShotsFired = 0;
        }

        // Create aura visual
        this.buffAura = this.scene.add.circle(
            this.sprite.x,
            this.sprite.y,
            30,
            cocktailConfig.color,
            0.4
        );
        this.buffAura.setDepth(-1);
    }

    updateDirection(worldVelX, worldVelY) {
        // Determine direction based on world-space velocity
        // In isometric, world directions map differently to visual directions

        let newDirection = this.currentDirection;

        // Prioritize X/Y movement - choose dominant direction
        if (Math.abs(worldVelX) > Math.abs(worldVelY)) {
            // X-dominant movement
            newDirection = worldVelX > 0 ? 'right' : 'left';
        } else {
            // Y-dominant movement
            newDirection = worldVelY > 0 ? 'down' : 'up';
        }

        // Only change texture if direction changed
        if (newDirection !== this.currentDirection) {
            this.currentDirection = newDirection;
            this.sprite.setTexture(`gisela-${this.color}-${newDirection}`);
        }
    }

    getActiveBuff() {
        // Check if buff expired
        if (this.activeBuff && Date.now() > this.buffEndTime) {
            this.clearBuff();
        }
        return this.activeBuff;
    }

    clearBuff() {
        this.activeBuff = null;
        this.buffEndTime = 0;
        this.damageRampMultiplier = 1.0;
        this.rampShotsFired = 0;

        if (this.buffAura) {
            this.buffAura.destroy();
            this.buffAura = null;
        }
    }

    storeCocktail(cocktailType, config) {
        // Remove old indicator if exists
        if (this.storedCocktailIndicator) {
            this.storedCocktailIndicator.destroy();
        }
        if (this.storedCocktailGlow) {
            this.storedCocktailGlow.destroy();
        }

        // Store the cocktail
        this.storedCocktail = {
            type: cocktailType,
            config: config
        };

        // Create subtle glow around player
        this.storedCocktailGlow = this.scene.add.circle(
            this.sprite.x,
            this.sprite.y,
            35,
            config.color,
            0.15  // Very subtle
        );
        this.storedCocktailGlow.setDepth(-1);

        // Create visual indicator (small sprite above player)
        this.storedCocktailIndicator = this.scene.add.image(
            this.sprite.x,
            this.sprite.y - 40,
            config.sprite
        );
        this.storedCocktailIndicator.setScale(0.5); // Small scale for indicator
        this.storedCocktailIndicator.setDepth(15);

        console.log(`Player ${this.playerName} stored cocktail:`, config.name);
    }

    activateStoredCocktail() {
        if (!this.storedCocktail) {
            console.log(`Player ${this.playerName} has no stored cocktail`);
            return false;
        }

        // If already have active buff, warn and don't activate
        if (this.activeBuff && Date.now() < this.buffEndTime) {
            console.log(`Player ${this.playerName} already has active buff`);
            return false;
        }

        // Apply the buff using existing system
        this.applyBuff(this.storedCocktail.config);

        console.log(`Player ${this.playerName} activated:`, this.storedCocktail.config.name);

        // Remove indicator and glow
        if (this.storedCocktailIndicator) {
            this.storedCocktailIndicator.destroy();
            this.storedCocktailIndicator = null;
        }
        if (this.storedCocktailGlow) {
            this.storedCocktailGlow.destroy();
            this.storedCocktailGlow = null;
        }

        // Clear stored cocktail
        this.storedCocktail = null;

        return true;
    }

    setSpeedMultiplier(multiplier) {
        this.speedMultiplier = multiplier;
    }

    destroy() {
        if (this.storedCocktailIndicator) {
            this.storedCocktailIndicator.destroy();
        }
        if (this.storedCocktailGlow) {
            this.storedCocktailGlow.destroy();
        }
        if (this.shadow) {
            this.shadow.destroy();
        }
        this.sprite.destroy();
    }
}
