/**
 * DestructionManager
 * Phase 5: Dynamic Events
 *
 * Tracks cumulative destruction level (0-100) and orchestrates:
 * - Chandelier falling system (3 chandeliers, 3 stages: stable → swaying → falling)
 * - Multi-stage prop degradation (visual changes based on health %)
 * - Wave-based transitions (environmental changes between waves)
 * - Destruction timeline (waves 1-3 pristine, 4-6 battle worn, 7-8 heavy combat, 9-10 apocalyptic)
 */
export class DestructionManager {
    constructor(scene) {
        this.scene = scene;

        // Cumulative destruction level (0-100)
        this.destructionLevel = 0;

        // Chandelier tracking
        this.chandeliers = [];
        this.chandeliersRemaining = 0;
        this.chandelier1FellWave = null;
        this.chandelier2FellWave = null;
        this.chandelier3Unstable = false;

        // Trapdoor tracking
        this.trapdoorsOpened = [];

        // Wave progression tracking
        this.currentWaveNumber = 0;
        this.environmentPhase = 'pristine'; // pristine, battle_worn, heavy_combat, apocalyptic

        console.log('DestructionManager initialized');
    }

    /**
     * Initialize destruction tracking for a new wave
     * Called at the start of each wave
     */
    initializeForWave(waveNumber) {
        this.currentWaveNumber = waveNumber;

        // Update environment phase based on wave
        this.updateEnvironmentPhase(waveNumber);

        // Handle chandelier falling based on wave number
        this.handleChandelierFalling(waveNumber);

        console.log(`DestructionManager: Wave ${waveNumber}, Phase: ${this.environmentPhase}`);
    }

    /**
     * Update environment phase based on wave number
     */
    updateEnvironmentPhase(waveNumber) {
        if (waveNumber <= 3) {
            this.environmentPhase = 'pristine';
        } else if (waveNumber <= 6) {
            this.environmentPhase = 'battle_worn';
        } else if (waveNumber <= 8) {
            this.environmentPhase = 'heavy_combat';
        } else {
            this.environmentPhase = 'apocalyptic';
        }
    }

    /**
     * Register a chandelier with the destruction manager
     * Called when chandeliers are spawned
     */
    registerChandelier(chandelier) {
        this.chandeliers.push(chandelier);
        this.chandeliersRemaining = this.chandeliers.length;

        console.log(`Registered chandelier at (${chandelier.x}, ${chandelier.y}). Total: ${this.chandeliersRemaining}`);
    }

    /**
     * Handle chandelier falling based on wave number
     * Wave 4: First chandelier falls
     * Wave 7: Second chandelier falls
     * Wave 9+: Third chandelier becomes unstable
     */
    handleChandelierFalling(waveNumber) {
        const aliveChandeliers = this.chandeliers.filter(c => c.isAlive());

        // Wave 4: Drop first chandelier
        if (waveNumber === 4 && !this.chandelier1FellWave && aliveChandeliers.length > 0) {
            console.log('Wave 4: Triggering first chandelier fall');
            this.triggerChandelierFall(0);
            this.chandelier1FellWave = 4;
        }

        // Wave 7: Drop second chandelier
        if (waveNumber === 7 && !this.chandelier2FellWave && aliveChandeliers.length > 0) {
            console.log('Wave 7: Triggering second chandelier fall');
            this.triggerChandelierFall(1);
            this.chandelier2FellWave = 7;
        }

        // Wave 9+: Third chandelier becomes unstable (can fall if damaged)
        if (waveNumber >= 9 && !this.chandelier3Unstable && aliveChandeliers.length > 0) {
            console.log('Wave 9+: Final chandelier is now unstable');
            this.chandelier3Unstable = true;

            // Find the last remaining chandelier and set it to swaying
            const lastChandelier = aliveChandeliers[aliveChandeliers.length - 1];
            if (lastChandelier) {
                lastChandelier.setState('swaying');
            }
        }
    }

    /**
     * Trigger a chandelier to fall
     * @param {number} index - Index of chandelier to drop (0, 1, or 2)
     */
    triggerChandelierFall(index) {
        const aliveChandeliers = this.chandeliers.filter(c => c.isAlive());

        if (index >= aliveChandeliers.length) {
            console.warn(`Cannot trigger chandelier fall - index ${index} out of range (only ${aliveChandeliers.length} alive)`);
            return;
        }

        const chandelier = aliveChandeliers[index];
        if (!chandelier) {
            console.warn('Chandelier not found at index', index);
            return;
        }

        console.log(`Triggering chandelier fall at (${chandelier.x}, ${chandelier.y})`);

        // Set chandelier to swaying state first (brief warning)
        chandelier.setState('swaying');

        // After 2 seconds, trigger the fall
        this.scene.time.delayedCall(2000, () => {
            if (chandelier.isAlive()) {
                chandelier.setState('falling');
                chandelier.fall();
            }
        });
    }

    /**
     * Track damage dealt to a prop
     * Updates cumulative destruction level
     */
    trackDamage(prop, damage) {
        // Update cumulative destruction level
        // Each point of damage adds to destruction (scaled by prop health)
        const destructionContribution = (damage / 200) * 10; // Normalized contribution
        this.destructionLevel = Math.min(100, this.destructionLevel + destructionContribution);

        // Check if chandelier should fall due to damage (only in wave 9+)
        if (this.chandelier3Unstable && prop.type === 'chandelier' && prop.getHealthPercent() < 0.2) {
            console.log('Unstable chandelier damaged below 20% HP - triggering fall!');
            prop.setState('falling');
            prop.fall();
        }
    }

    /**
     * Get current destruction level (0-100)
     */
    getDestructionLevel() {
        return Math.floor(this.destructionLevel);
    }

    /**
     * Get current environment phase
     */
    getEnvironmentPhase() {
        return this.environmentPhase;
    }

    /**
     * Open a trapdoor at specified location
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    openTrapdoor(x, y) {
        // Check if trapdoor already exists at this location
        const existing = this.trapdoorsOpened.find(td =>
            Math.abs(td.x - x) < 50 && Math.abs(td.y - y) < 50
        );

        if (existing) {
            console.log('Trapdoor already open at this location');
            return;
        }

        console.log(`Opening trapdoor at (${x}, ${y})`);

        // Create visual representation of trapdoor
        const trapdoor = this.scene.add.rectangle(x, y, 60, 60, 0x000000, 0.8);
        trapdoor.setStrokeStyle(3, 0x654321);
        trapdoor.setDepth(1);

        // Add to tracking
        this.trapdoorsOpened.push({ x, y, sprite: trapdoor });

        // Create warning effect
        const warning = this.scene.add.circle(x, y, 80, 0xFF0000, 0);
        warning.setStrokeStyle(3, 0xFF0000);
        warning.setDepth(2);

        this.scene.tweens.add({
            targets: warning,
            alpha: { from: 0.6, to: 0 },
            scale: { from: 1, to: 1.5 },
            duration: 800,
            repeat: 2,
            onComplete: () => warning.destroy()
        });

        // Check for entities above trapdoor and apply fall damage
        this.checkTrapdoorFalls(x, y);
    }

    /**
     * Check if any entities are above the trapdoor and apply fall damage
     */
    checkTrapdoorFalls(x, y) {
        const radius = 30; // Half of trapdoor size

        // Check players
        if (this.scene.playerManager) {
            this.scene.playerManager.getLivingPlayers().forEach(player => {
                const dx = player.getX() - x;
                const dy = player.getY() - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    console.log('Player fell through trapdoor!');
                    player.takeDamage(15);

                    // Visual effect
                    this.createFallEffect(player.getX(), player.getY());
                }
            });
        }

        // Check enemies (instant kill for non-boss enemies)
        if (this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                if (!enemy.isAlive()) return;

                const dx = enemy.getSprite().x - x;
                const dy = enemy.getSprite().y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    // Instant kill for non-boss enemies
                    if (!enemy.config || !enemy.config.isBoss) {
                        console.log('Enemy fell through trapdoor - instant kill!');
                        enemy.takeDamage(enemy.health); // Kill instantly

                        // Visual effect
                        this.createFallEffect(enemy.getSprite().x, enemy.getSprite().y);
                    } else {
                        // Bosses take damage but don't fall
                        console.log('Boss damaged by trapdoor');
                        enemy.takeDamage(30);
                    }
                }
            });
        }
    }

    /**
     * Create visual effect for falling through trapdoor
     */
    createFallEffect(x, y) {
        // Create spiral particles falling down
        for (let i = 0; i < 5; i++) {
            const particle = this.scene.add.circle(
                x + (Math.random() - 0.5) * 20,
                y,
                3 + Math.random() * 3,
                0xFFFF00,
                0.8
            );
            particle.setDepth(3);

            this.scene.tweens.add({
                targets: particle,
                y: y + 50,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Handle boss-triggered environmental events
     * @param {string} bossType - Type of boss (kraken, leviathan, etc.)
     * @param {string} eventType - Type of event (slam, electrify, etc.)
     * @param {Object} data - Event-specific data
     */
    handleBossEvent(bossType, eventType, data) {
        console.log(`Boss event: ${bossType} - ${eventType}`, data);

        // Kraken Boss Events
        if (bossType === 'boss_kraken_arm') {
            this.handleKrakenEvent(eventType, data);
        }

        // Leviathan Boss Events
        if (bossType === 'boss_leviathan') {
            this.handleLeviathanEvent(eventType, data);
        }
    }

    /**
     * Handle Kraken-specific boss events
     */
    handleKrakenEvent(eventType, data) {
        switch (eventType) {
            case 'tentacleSlam':
                // Destroys all props in 60px impact zone
                if (data.x !== undefined && data.y !== undefined) {
                    console.log(`Kraken tentacle slam at (${data.x}, ${data.y})`);

                    // Destroy props in radius
                    if (this.scene.environmentManager) {
                        this.scene.environmentManager.damagePropsInRadius(data.x, data.y, 60, 999);
                    }

                    // 30% chance to open trapdoor
                    if (Math.random() < 0.3) {
                        this.openTrapdoor(data.x, data.y);
                    }

                    // Visual effect
                    this.createImpactEffect(data.x, data.y, 60, 0x9966cc);
                }
                break;

            case 'throwProp':
                // Kraken throws a prop - handled in physics system
                console.log('Kraken threw prop');
                break;

            case 'wallSmash':
                // Breaks through back room wall (visual effect)
                if (data.x !== undefined && data.y !== undefined) {
                    console.log('Kraken smashed through wall!');
                    this.createWallSmashEffect(data.x, data.y);
                }
                break;

            case 'beamCrush':
                // Damages support beam causing stage tilt
                if (data.beamIndex !== undefined) {
                    this.crushSupportBeam(data.beamIndex);
                }
                break;
        }
    }

    /**
     * Handle Leviathan-specific boss events
     */
    handleLeviathanEvent(eventType, data) {
        switch (eventType) {
            case 'electricalSurge':
                // Auto-ignites all oil lamps in arena
                console.log('Leviathan electrical surge - igniting all lamps!');
                this.igniteAllOilLamps();

                // Also make chandeliers sway
                this.chandeliers.forEach(chandelier => {
                    if (chandelier.isAlive()) {
                        chandelier.setState('swaying');
                    }
                });
                break;

            case 'tailSweep':
                // 180° arc attack knocks all lightweight props across room
                if (data.x !== undefined && data.y !== undefined && data.angle !== undefined) {
                    console.log('Leviathan tail sweep!');
                    this.knockbackLightProps(data.x, data.y, data.angle);
                }
                break;

            case 'lightningStrike':
                // Random prop takes 50 damage
                if (data.propIndex !== undefined) {
                    this.strikeRandomProp();
                }
                break;

            case 'electrifyMetal':
                // All metal props become hazards (10 DPS)
                console.log('Leviathan electrifying metal props!');
                this.electrifyMetalProps();
                break;

            case 'lightningChain':
                // Strikes metal props creating chain damage
                if (data.x !== undefined && data.y !== undefined) {
                    console.log('Leviathan lightning chain attack!');
                    this.createLightningChain(data.x, data.y);
                }
                break;

            case 'explodeLights':
                // Stage lights explode in sequence
                console.log('Leviathan causing stage lights to explode!');
                this.explodeStageLights();
                break;
        }
    }

    /**
     * Crush a support beam (Kraken attack)
     */
    crushSupportBeam(beamIndex) {
        if (!this.scene.environmentManager) return;

        const supportBeams = this.scene.environmentManager.props.filter(p => p.type === 'supportBeam' && p.isAlive());

        if (beamIndex >= 0 && beamIndex < supportBeams.length) {
            const beam = supportBeams[beamIndex];
            console.log(`Kraken crushing support beam ${beamIndex} at (${beam.x}, ${beam.y})`);

            // Deal massive damage to destroy beam
            beam.takeDamage(999);

            // Create stage tilt effect
            this.scene.cameras.main.shake(1000, 0.02);

            // Flash red
            this.scene.cameras.main.flash(500, 255, 0, 0);
        }
    }

    /**
     * Create wall smash visual effect (Kraken attack)
     */
    createWallSmashEffect(x, y) {
        // Create debris particles
        for (let i = 0; i < 10; i++) {
            const debris = this.scene.add.rectangle(
                x + (Math.random() - 0.5) * 40,
                y + (Math.random() - 0.5) * 40,
                10 + Math.random() * 10,
                10 + Math.random() * 10,
                0x654321
            );
            debris.setDepth(15);

            this.scene.tweens.add({
                targets: debris,
                x: debris.x + (Math.random() - 0.5) * 200,
                y: debris.y + Math.random() * 150,
                alpha: 0,
                rotation: Math.random() * Math.PI * 2,
                duration: 800 + Math.random() * 400,
                onComplete: () => debris.destroy()
            });
        }

        // Camera shake
        this.scene.cameras.main.shake(300, 0.015);
    }

    /**
     * Ignite all oil lamps (Leviathan electrical surge)
     */
    igniteAllOilLamps() {
        if (!this.scene.environmentManager) return;

        const oilLamps = this.scene.environmentManager.props.filter(p => p.type === 'oilLamp' && p.isAlive());

        oilLamps.forEach(lamp => {
            // Destroy lamp to trigger fire zone creation
            lamp.takeDamage(999);
        });

        console.log(`Ignited ${oilLamps.length} oil lamps`);
    }

    /**
     * Knock back all lightweight props (Leviathan tail sweep)
     */
    knockbackLightProps(x, y, angle) {
        if (!this.scene.environmentManager || !this.scene.environmentManager.physicsManager) return;

        const lightProps = this.scene.environmentManager.props.filter(p =>
            p.weightClass === 'light' && p.isAlive()
        );

        lightProps.forEach(prop => {
            const dx = prop.x - x;
            const dy = prop.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Check if prop is in sweep arc (180 degrees)
            const propAngle = Math.atan2(dy, dx);
            const angleDiff = Math.abs(propAngle - angle);

            if (dist < 300 && angleDiff < Math.PI / 2) {
                // Apply strong knockback force
                const forceX = (dx / dist) * 800;
                const forceY = (dy / dist) * 800;

                if (prop.sprite && prop.sprite.body) {
                    prop.sprite.body.setVelocity(forceX, forceY);
                }
            }
        });

        // Visual effect
        this.createSweepEffect(x, y, angle);
    }

    /**
     * Strike a random prop with lightning (Leviathan)
     */
    strikeRandomProp() {
        if (!this.scene.environmentManager) return;

        const aliveProps = this.scene.environmentManager.props.filter(p =>
            p.isAlive() && p.type !== 'chandelier'
        );

        if (aliveProps.length === 0) return;

        const randomProp = aliveProps[Math.floor(Math.random() * aliveProps.length)];

        console.log(`Lightning striking ${randomProp.type} at (${randomProp.x}, ${randomProp.y})`);

        // Lightning visual
        const lightning = this.scene.add.rectangle(
            randomProp.x,
            randomProp.y,
            20,
            1080,
            0xFFFF00,
            0.8
        );
        lightning.setDepth(30);

        this.scene.time.delayedCall(150, () => {
            lightning.destroy();
            randomProp.takeDamage(50);
        });
    }

    /**
     * Electrify all metal props (Leviathan Phase 2)
     */
    electrifyMetalProps() {
        if (!this.scene.environmentManager) return;

        // Piano, safe, mirrors, barrels are considered "metal" for this effect
        const metalTypes = ['barrel', 'barCounter'];

        const metalProps = this.scene.environmentManager.props.filter(p =>
            metalTypes.includes(p.type) && p.isAlive()
        );

        metalProps.forEach(prop => {
            // Add electric hazard visual
            if (!prop.electricHazard) {
                prop.electricHazard = true;

                const electric = this.scene.add.circle(prop.x, prop.y, Math.max(prop.width, prop.height) / 2 + 10, 0xFFFF00, 0.3);
                electric.setDepth(5);
                prop.electricEffect = electric;

                // Periodic damage to nearby entities
                prop.electricInterval = setInterval(() => {
                    if (!prop.isAlive()) {
                        clearInterval(prop.electricInterval);
                        if (prop.electricEffect) prop.electricEffect.destroy();
                        return;
                    }

                    this.damageEntitiesNearProp(prop, 10);
                }, 1000);
            }
        });

        console.log(`Electrified ${metalProps.length} metal props`);
    }

    /**
     * Create lightning chain effect (Leviathan Phase 2)
     */
    createLightningChain(startX, startY) {
        if (!this.scene.environmentManager) return;

        const metalTypes = ['barrel', 'barCounter'];
        const metalProps = this.scene.environmentManager.props.filter(p =>
            metalTypes.includes(p.type) && p.isAlive()
        );

        if (metalProps.length === 0) return;

        // Chain to nearest 3 metal props
        let currentX = startX;
        let currentY = startY;
        const chained = [];

        for (let i = 0; i < Math.min(3, metalProps.length); i++) {
            // Find closest unchained metal prop
            let closest = null;
            let closestDist = Infinity;

            metalProps.forEach(prop => {
                if (chained.includes(prop)) return;

                const dx = prop.x - currentX;
                const dy = prop.y - currentY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < closestDist) {
                    closestDist = dist;
                    closest = prop;
                }
            });

            if (closest) {
                chained.push(closest);

                // Draw lightning line
                const line = this.scene.add.line(0, 0, currentX, currentY, closest.x, closest.y, 0xFFFF00);
                line.setLineWidth(3);
                line.setOrigin(0, 0);
                line.setDepth(30);

                // Damage prop
                closest.takeDamage(30);

                // Damage nearby entities
                this.damageEntitiesNearProp(closest, 20);

                // Clean up line
                this.scene.time.delayedCall(200, () => line.destroy());

                currentX = closest.x;
                currentY = closest.y;
            }
        }
    }

    /**
     * Explode all stage lights in sequence (Leviathan Phase 2)
     */
    explodeStageLights() {
        if (!this.scene.environmentManager) return;

        const lights = this.scene.environmentManager.props.filter(p => p.type === 'stageLights' && p.isAlive());

        lights.forEach((light, index) => {
            // Stagger explosions
            this.scene.time.delayedCall(index * 500, () => {
                if (light.isAlive()) {
                    console.log(`Exploding stage light at (${light.x}, ${light.y})`);

                    // Create explosion visual
                    const explosion = this.scene.add.circle(light.x, light.y, 40, 0xFFFF00, 0.8);
                    explosion.setDepth(25);

                    this.scene.tweens.add({
                        targets: explosion,
                        scale: 2,
                        alpha: 0,
                        duration: 400,
                        onComplete: () => explosion.destroy()
                    });

                    // Destroy light
                    light.takeDamage(999);

                    // Create glass hazards (small damage zones)
                    for (let i = 0; i < 3; i++) {
                        const glassX = light.x + (Math.random() - 0.5) * 60;
                        const glassY = light.y + Math.random() * 80;

                        const glass = this.scene.add.circle(glassX, glassY, 5, 0xFFFFFF, 0.6);
                        glass.setDepth(10);

                        // Glass causes minor damage on contact
                        this.scene.time.delayedCall(100, () => {
                            this.damageEntitiesAt(glassX, glassY, 20, 5);
                        });

                        // Clean up glass
                        this.scene.time.delayedCall(3000, () => glass.destroy());
                    }
                }
            });
        });
    }

    /**
     * Create impact effect visual
     */
    createImpactEffect(x, y, radius, color) {
        const impact = this.scene.add.circle(x, y, radius, color, 0.6);
        impact.setDepth(20);

        this.scene.tweens.add({
            targets: impact,
            scale: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => impact.destroy()
        });

        this.scene.cameras.main.shake(200, 0.01);
    }

    /**
     * Create sweep effect visual
     */
    createSweepEffect(x, y, angle) {
        // Create arc visual
        const arc = this.scene.add.arc(x, y, 250, angle - 90, angle + 90, false, 0x4169e1, 0.4);
        arc.setDepth(15);

        this.scene.tweens.add({
            targets: arc,
            alpha: 0,
            duration: 400,
            onComplete: () => arc.destroy()
        });
    }

    /**
     * Damage entities near a prop (for electric hazards)
     */
    damageEntitiesNearProp(prop, damage) {
        const radius = Math.max(prop.width, prop.height) / 2 + 20;
        this.damageEntitiesAt(prop.x, prop.y, radius, damage);
    }

    /**
     * Damage entities at location
     */
    damageEntitiesAt(x, y, radius, damage) {
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
    }

    /**
     * Get wave-based environmental changes description
     * Used for logging and debugging
     */
    getEnvironmentDescription() {
        const descriptions = {
            pristine: 'Pristine saloon - all props intact, 3 chandeliers, clean environment',
            battle_worn: 'Battle worn - first chandelier fallen, 30% props damaged, scorch marks visible',
            heavy_combat: 'Heavy combat - second chandelier fallen, 50% props destroyed, structural damage',
            apocalyptic: 'Apocalyptic - 70% props destroyed, final chandelier unstable, multiple trapdoors'
        };

        return descriptions[this.environmentPhase] || 'Unknown phase';
    }

    /**
     * Reset destruction manager (for new game)
     */
    reset() {
        this.destructionLevel = 0;
        this.chandeliers = [];
        this.chandeliersRemaining = 0;
        this.chandelier1FellWave = null;
        this.chandelier2FellWave = null;
        this.chandelier3Unstable = false;
        this.trapdoorsOpened.forEach(td => {
            if (td.sprite) td.sprite.destroy();
        });
        this.trapdoorsOpened = [];
        this.currentWaveNumber = 0;
        this.environmentPhase = 'pristine';

        console.log('DestructionManager reset');
    }
}
