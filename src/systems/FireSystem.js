/**
 * FireSystem
 * Manages fire zones, damage over time, and fire spread mechanics
 * Part of Phase 3 of the environment system
 */
export class FireSystem {
    constructor(scene) {
        this.scene = scene;
        this.fireZones = [];
    }

    /**
     * Create a new fire zone at the specified location
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Fire zone radius
     * @param {number} duration - Duration in milliseconds
     * @param {number} damage - Damage per second
     */
    createFireZone(x, y, radius, duration, damage) {
        // Create visual fire effect
        const fireSprite = this.createFireVisual(x, y, radius);

        // Calculate expiration time
        const expiresAt = this.scene.time.now + duration;

        // Create fire zone data
        const fireZone = {
            x,
            y,
            radius,
            damage, // Damage per second
            expiresAt,
            sprite: fireSprite,
            particles: []
        };

        // Create particle effects
        this.createFireParticles(fireZone);

        this.fireZones.push(fireZone);

        console.log(`Fire zone created at (${x}, ${y}) - radius: ${radius}, duration: ${duration}ms, damage: ${damage} DPS`);

        return fireZone;
    }

    /**
     * Create visual representation of fire zone
     */
    createFireVisual(x, y, radius) {
        // Create a glowing orange circle for the fire zone
        const fireCircle = this.scene.add.circle(x, y, radius, 0xFF4500, 0.4);
        fireCircle.setDepth(15); // Above ground, below entities

        // Add pulsing animation
        this.scene.tweens.add({
            targets: fireCircle,
            alpha: { from: 0.4, to: 0.6 },
            scale: { from: 0.95, to: 1.05 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return fireCircle;
    }

    /**
     * Create fire particle effects
     */
    createFireParticles(fireZone) {
        const numParticles = 8 + Math.floor(fireZone.radius / 10);

        for (let i = 0; i < numParticles; i++) {
            this.createFireParticle(fireZone);
        }

        // Create new particles periodically while fire is active
        fireZone.particleTimer = this.scene.time.addEvent({
            delay: 200,
            callback: () => {
                if (this.scene.time.now < fireZone.expiresAt) {
                    this.createFireParticle(fireZone);
                }
            },
            loop: true
        });
    }

    /**
     * Create a single fire particle
     */
    createFireParticle(fireZone) {
        // Random position within fire zone
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * fireZone.radius * 0.7;
        const startX = fireZone.x + Math.cos(angle) * distance;
        const startY = fireZone.y + Math.sin(angle) * distance;

        // Particle size
        const size = 4 + Math.random() * 6;

        // Alternate between orange and yellow
        const colors = [0xFF4500, 0xFF6B00, 0xFF8C00, 0xFFD700];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const particle = this.scene.add.circle(startX, startY, size, color, 0.8);
        particle.setDepth(16);

        fireZone.particles.push(particle);

        // Animate particle rising and fading
        this.scene.tweens.add({
            targets: particle,
            y: startY - 30 - Math.random() * 20,
            x: startX + (Math.random() - 0.5) * 15,
            alpha: 0,
            scale: 0.2,
            duration: 600 + Math.random() * 400,
            ease: 'Power2',
            onComplete: () => {
                particle.destroy();
                const index = fireZone.particles.indexOf(particle);
                if (index > -1) {
                    fireZone.particles.splice(index, 1);
                }
            }
        });
    }

    /**
     * Update fire zones - apply damage and check for expiration
     * @param {number} delta - Time since last frame in milliseconds
     */
    update(delta) {
        const currentTime = this.scene.time.now;

        // Update each fire zone
        for (let i = this.fireZones.length - 1; i >= 0; i--) {
            const fireZone = this.fireZones[i];

            // Check if fire zone has expired
            if (currentTime >= fireZone.expiresAt) {
                this.removeFireZone(i);
                continue;
            }

            // Apply fire damage to entities
            this.applyFireDamageToEntities(fireZone, delta);

            // Check for fire spread to nearby flammable props (Phase 3.5 feature)
            // this.checkFireSpread(fireZone);
        }
    }

    /**
     * Apply fire damage to all entities in the fire zone
     */
    applyFireDamageToEntities(fireZone, delta) {
        // Damage calculation - apply every 200ms (5 ticks per second)
        // Convert DPS to damage per tick
        const damagePerTick = fireZone.damage / 5;

        // Check if enough time has passed for damage tick
        if (!fireZone.lastDamageTick) {
            fireZone.lastDamageTick = this.scene.time.now;
        }

        const timeSinceLastTick = this.scene.time.now - fireZone.lastDamageTick;
        if (timeSinceLastTick < 200) {
            return; // Not time for damage tick yet
        }

        // Reset damage tick timer
        fireZone.lastDamageTick = this.scene.time.now;

        // Damage players
        if (this.scene.playerManager) {
            this.scene.playerManager.getLivingPlayers().forEach(player => {
                if (this.isEntityInFireZone(player.getX(), player.getY(), fireZone)) {
                    player.takeDamage(damagePerTick);
                    this.showBurningEffect(player.getX(), player.getY());
                }
            });
        }

        // Damage enemies
        if (this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                if (!enemy.isAlive()) return;

                const enemySprite = enemy.getSprite();
                if (this.isEntityInFireZone(enemySprite.x, enemySprite.y, fireZone)) {
                    enemy.takeDamage(damagePerTick);
                    this.showBurningEffect(enemySprite.x, enemySprite.y);
                }
            });
        }
    }

    /**
     * Check if an entity is inside a fire zone
     */
    isEntityInFireZone(x, y, fireZone) {
        const dx = x - fireZone.x;
        const dy = y - fireZone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < fireZone.radius;
    }

    /**
     * Show visual effect on burning entity
     */
    showBurningEffect(x, y) {
        // Create small fire particle above entity
        const particle = this.scene.add.circle(
            x + (Math.random() - 0.5) * 20,
            y - 20 - Math.random() * 10,
            3,
            0xFF4500,
            0.8
        );
        particle.setDepth(50);

        // Animate and destroy
        this.scene.tweens.add({
            targets: particle,
            y: particle.y - 15,
            alpha: 0,
            duration: 300,
            onComplete: () => particle.destroy()
        });
    }

    /**
     * Remove a fire zone and clean up its visuals
     */
    removeFireZone(index) {
        const fireZone = this.fireZones[index];

        // Fade out main sprite
        if (fireZone.sprite) {
            this.scene.tweens.add({
                targets: fireZone.sprite,
                alpha: 0,
                duration: 500,
                onComplete: () => fireZone.sprite.destroy()
            });
        }

        // Stop particle timer
        if (fireZone.particleTimer) {
            fireZone.particleTimer.remove();
        }

        // Clean up remaining particles
        fireZone.particles.forEach(particle => {
            if (particle) {
                particle.destroy();
            }
        });

        // Remove from array
        this.fireZones.splice(index, 1);

        console.log('Fire zone expired and removed');
    }

    /**
     * Check for fire spread to nearby flammable props
     * Phase 3.5 feature - currently disabled
     */
    checkFireSpread(fireZone) {
        if (!this.scene.environmentManager) return;

        // Get props in fire zone radius
        const nearbyProps = this.scene.environmentManager.getPropsInRadius(
            fireZone.x,
            fireZone.y,
            fireZone.radius
        );

        nearbyProps.forEach(prop => {
            // Check if prop is flammable (wood-based props)
            const flammableTypes = ['woodenChair', 'cardTable', 'barrel'];
            if (flammableTypes.includes(prop.type)) {
                // Check if prop has been in fire long enough
                if (!prop.fireExposureTime) {
                    prop.fireExposureTime = 0;
                }
                prop.fireExposureTime += 100; // Assuming 100ms update

                // Ignite after 2 seconds of exposure
                if (prop.fireExposureTime >= 2000 && !prop.isOnFire) {
                    prop.isOnFire = true;
                    // Create new fire zone at prop location
                    this.createFireZone(prop.x, prop.y, 30, 5000, 3);
                }
            }
        });
    }

    /**
     * Get all active fire zones
     */
    getActiveFireZones() {
        return this.fireZones;
    }

    /**
     * Check if a position is in any fire zone
     * Returns the fire zone if found, null otherwise
     */
    getFireZoneAtPosition(x, y) {
        for (const fireZone of this.fireZones) {
            if (this.isEntityInFireZone(x, y, fireZone)) {
                return fireZone;
            }
        }
        return null;
    }

    /**
     * Clear all fire zones (for wave reset)
     */
    clearAll() {
        for (let i = this.fireZones.length - 1; i >= 0; i--) {
            this.removeFireZone(i);
        }
    }
}
