export class TargetSelector {
    constructor(scene) {
        this.scene = scene;
        this.lockedTarget = null;
        this.currentTarget = null;
        this.maxRange = 500; // Auto-aim search radius
        this.influenceConeAngle = Math.PI / 3; // 60 degree cone
    }

    update(playerWorldX, playerWorldY, aimInfluence, inputMode, enemies) {
        // Remove lock if target is dead
        if (this.lockedTarget) {
            if (this.lockedTarget.type === 'enemy') {
                if (!this.lockedTarget.enemy || !this.lockedTarget.enemy.isAlive()) {
                    this.clearLock();
                }
            } else if (this.lockedTarget.type === 'tentacle') {
                const tentacle = this.lockedTarget.enemy.tentacles[this.lockedTarget.tentacleIndex];
                if (!this.lockedTarget.enemy || !this.lockedTarget.enemy.isAlive() || !tentacle || !tentacle.alive) {
                    this.clearLock();
                }
            } else if (this.lockedTarget.type === 'prop') {
                if (!this.lockedTarget.prop || !this.lockedTarget.prop.isAlive()) {
                    this.clearLock();
                }
            }
        }

        // Priority 1: Locked target (enemy or tentacle)
        if (this.lockedTarget) {
            this.currentTarget = this.lockedTarget;
            return this.currentTarget;
        }

        // Get enemies in range (use WORLD coordinates)
        const enemiesInRange = enemies.filter(enemy => {
            if (!enemy.isAlive()) return false;
            const dx = enemy.worldX - playerWorldX;
            const dy = enemy.worldY - playerWorldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= this.maxRange;
        });

        if (enemiesInRange.length === 0) {
            this.currentTarget = null;
            return null;
        }

        // Priority 2: Influenced target (if aim influence active)
        let influencedTarget = null;

        if (inputMode === 'gamepad') {
            // Right stick direction
            if (Math.abs(aimInfluence.x) > 0.1 || Math.abs(aimInfluence.y) > 0.1) {
                const influenceAngle = Math.atan2(aimInfluence.y, aimInfluence.x);
                influencedTarget = this.findTargetInCone(
                    playerWorldX, playerWorldY,
                    influenceAngle,
                    enemiesInRange
                );
            }
        } else {
            // Mouse cursor position (now in WORLD coordinates from InputManager)
            const dx = aimInfluence.x - playerWorldX;
            const dy = aimInfluence.y - playerWorldY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 1) { // Dead zone (1 world unit)
                const influenceAngle = Math.atan2(dy, dx);
                influencedTarget = this.findTargetInCone(
                    playerWorldX, playerWorldY,
                    influenceAngle,
                    enemiesInRange
                );
            }
        }

        if (influencedTarget) {
            this.currentTarget = influencedTarget;
            return this.currentTarget;
        }

        // Priority 3: Nearest enemy (fallback)
        const nearest = this.findNearestEnemy(playerWorldX, playerWorldY, enemiesInRange);
        this.currentTarget = nearest;
        return this.currentTarget;
    }

    findTargetInCone(playerWorldX, playerWorldY, coneAngle, enemies) {
        let bestTarget = null;
        let bestScore = -Infinity;

        enemies.forEach(enemy => {
            const dx = enemy.worldX - playerWorldX;
            const dy = enemy.worldY - playerWorldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angleToEnemy = Math.atan2(dy, dx);

            // Calculate angle difference
            let angleDiff = Math.abs(angleToEnemy - coneAngle);
            if (angleDiff > Math.PI) {
                angleDiff = 2 * Math.PI - angleDiff;
            }

            // Check if in cone
            if (angleDiff <= this.influenceConeAngle / 2) {
                // Score = closer + more aligned is better
                const score = (1 / distance) * (1 - angleDiff / (this.influenceConeAngle / 2));

                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = enemy;
                }
            }
        });

        return bestTarget;
    }

    findNearestEnemy(playerWorldX, playerWorldY, enemies) {
        let nearest = null;
        let minDistance = Infinity;

        enemies.forEach(enemy => {
            const dx = enemy.worldX - playerWorldX;
            const dy = enemy.worldY - playerWorldY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = enemy;
            }
        });

        return nearest;
    }

    lockTarget(target) {
        // Accept any target structure (enemy object or tentacle object)
        this.lockedTarget = target;
    }

    clearLock() {
        this.lockedTarget = null;
    }

    cycleToEnemyTarget(playerWorldX, playerWorldY, enemies, direction) {
        // Build list of enemy targets only (E key)
        const targets = [];

        enemies.forEach(enemy => {
            if (!enemy.isAlive()) return;

            // Add main enemy body (use WORLD coordinates)
            targets.push({
                type: 'enemy',
                enemy: enemy,
                x: enemy.worldX,
                y: enemy.worldY,
                label: enemy.config.name
            });

            // Add Kraken tentacles as separate targets
            if (enemy.type === 'boss_kraken_arm' && enemy.tentacleSprites) {
                enemy.tentacleSprites.forEach((sprite, index) => {
                    if (sprite && enemy.tentacles[index] && enemy.tentacles[index].alive) {
                        targets.push({
                            type: 'tentacle',
                            enemy: enemy,
                            tentacleIndex: index,
                            x: sprite.x,  // TODO: tentacles may need world coords too
                            y: sprite.y,
                            label: `Tentacle ${index + 1}`
                        });
                    }
                });
            }
        });

        this.cycleTargets(targets, playerWorldX, playerWorldY, direction);
    }

    cycleToPropTarget(playerWorldX, playerWorldY, direction) {
        // Build list of prop targets only (Q key)
        const targets = [];

        // Add targetable props from environment manager (use WORLD coordinates)
        if (this.scene.environmentManager) {
            const props = this.scene.environmentManager.getProps();
            props.forEach(prop => {
                if (!prop.isAlive()) return;

                // Only add targetable props (explosives, hazards, and stage lights)
                // Chandeliers are NOT targetable (they fall automatically via wave system)
                const isTargetable = prop.explosionRadius > 0 ||
                                    prop.className === 'HazardProp' ||
                                    (prop.className === 'TacticalProp' && prop.type === 'stageLights');

                if (isTargetable) {
                    targets.push({
                        type: 'prop',
                        prop: prop,
                        x: prop.worldX,
                        y: prop.worldY,
                        label: prop.name || prop.type
                    });
                }
            });
        }

        // Add targetable props from fortification manager (use WORLD coordinates)
        if (this.scene.fortificationManager) {
            const fortProps = this.scene.fortificationManager.fortificationProps;
            fortProps.forEach(prop => {
                if (!prop.isAlive()) return;

                // Add explosive/hazardous fortification props
                const isTargetable = prop.explosionRadius > 0 || prop.className === 'HazardProp';

                if (isTargetable) {
                    targets.push({
                        type: 'prop',
                        prop: prop,
                        x: prop.worldX,
                        y: prop.worldY,
                        label: prop.name || prop.type
                    });
                }
            });
        }

        this.cycleTargets(targets, playerWorldX, playerWorldY, direction);
    }

    cycleTargets(targets, playerWorldX, playerWorldY, direction) {
        // Common cycling logic for both enemy and prop targets

        if (targets.length === 0) {
            this.clearLock();
            return;
        }

        // Sort by distance from player (in WORLD coordinates)
        targets.sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - playerWorldX, 2) + Math.pow(a.y - playerWorldY, 2));
            const distB = Math.sqrt(Math.pow(b.x - playerWorldX, 2) + Math.pow(b.y - playerWorldY, 2));
            return distA - distB;
        });

        // Find current lock index
        let currentIndex = targets.findIndex(t => {
            if (!this.lockedTarget) return false;
            if (t.type === 'enemy') {
                return t.enemy === this.lockedTarget.enemy && this.lockedTarget.type === 'enemy';
            } else if (t.type === 'tentacle') {
                return t.enemy === this.lockedTarget.enemy &&
                       t.tentacleIndex === this.lockedTarget.tentacleIndex &&
                       this.lockedTarget.type === 'tentacle';
            } else if (t.type === 'prop') {
                return t.prop === this.lockedTarget.prop && this.lockedTarget.type === 'prop';
            }
            return false;
        });

        if (currentIndex === -1) {
            // No current lock, lock nearest
            this.lockedTarget = targets[0];
        } else {
            // Cycle to next/prev
            if (direction === 'next') {
                currentIndex = (currentIndex + 1) % targets.length;
            } else {
                currentIndex = (currentIndex - 1 + targets.length) % targets.length;
            }
            this.lockedTarget = targets[currentIndex];
        }
    }

    getCurrentTarget() {
        return this.currentTarget;
    }

    getLockedTarget() {
        return this.lockedTarget;
    }

    isTargetLocked() {
        return this.lockedTarget !== null && this.lockedTarget.isAlive();
    }
}
