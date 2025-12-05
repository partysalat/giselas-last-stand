# Phase 3: Fire System Architecture

## System Overview

```
GameScene.update(time, delta)
    │
    └─> EnvironmentManager.update(delta)
            │
            ├─> PhysicsManager.update(delta)  [Phase 2]
            │
            ├─> FireSystem.update(delta)      [Phase 3] ← NEW
            │       │
            │       └─> For each fire zone:
            │               ├─> Check expiration
            │               ├─> Apply damage to players
            │               ├─> Apply damage to enemies
            │               └─> Show visual effects
            │
            └─> For each prop:
                    └─> prop.update(delta)
```

## Fire Zone Creation Flow

```
Player shoots Oil Lamp
    │
    ├─> EnvironmentProp.takeDamage()
    │       │
    │       └─> health reaches 0
    │               │
    │               └─> EnvironmentProp.destroy()
    │                       │
    │                       └─> EnvironmentProp.triggerDestructionEffect()
    │                               │
    │                               └─> if (onDestroy === 'createFireZone')
    │                                       │
    │                                       └─> EnvironmentProp.createFireZone()
    │                                               │
    │                                               └─> FireSystem.createFireZone(x, y, radius, duration, damage)
    │                                                       │
    │                                                       ├─> Create visual sprite
    │                                                       ├─> Create particle effects
    │                                                       ├─> Add to fireZones array
    │                                                       └─> Return fireZone object
    │
    └─> Fire zone is now active
```

## Damage Application Flow

```
FireSystem.update(delta)
    │
    └─> For each fire zone:
            │
            ├─> Check if 200ms have passed since last damage tick
            │
            └─> If yes:
                    │
                    ├─> PlayerManager.getLivingPlayers()
                    │       │
                    │       └─> For each player:
                    │               │
                    │               └─> if isEntityInFireZone(player.x, player.y):
                    │                       │
                    │                       ├─> player.takeDamage(1)
                    │                       └─> showBurningEffect(player.x, player.y)
                    │
                    └─> scene.enemies
                            │
                            └─> For each enemy:
                                    │
                                    └─> if isEntityInFireZone(enemy.x, enemy.y):
                                            │
                                            ├─> enemy.takeDamage(1)
                                            └─> showBurningEffect(enemy.x, enemy.y)
```

## Fire Zone Lifecycle

```
Creation
    │
    └─> FireSystem.createFireZone()
            │
            ├─> Create visual circle sprite (orange, pulsing)
            ├─> Create particle timer (new particle every 200ms)
            ├─> Calculate expiration time (now + duration)
            └─> Add to fireZones array
                    │
                    └─> Active State
                            │
                            ├─> Every frame:
                            │       │
                            │       ├─> Update animations
                            │       └─> Check for damage ticks
                            │
                            └─> When time.now >= expiresAt:
                                    │
                                    └─> FireSystem.removeFireZone()
                                            │
                                            ├─> Fade out sprite
                                            ├─> Stop particle timer
                                            ├─> Destroy remaining particles
                                            └─> Remove from fireZones array
                                                    │
                                                    └─> Destroyed (cleanup complete)
```

## Class Relationships

```
GameScene
    │
    ├── has ──> EnvironmentManager
    │               │
    │               ├── has ──> PhysicsManager [Phase 2]
    │               │               │
    │               │               └── manages ──> Moving props
    │               │
    │               ├── has ──> FireSystem [Phase 3]
    │               │               │
    │               │               └── manages ──> Fire zones
    │               │
    │               └── has ──> EnvironmentProp[] (props array)
    │                               │
    │                               └── each prop can trigger ──> Fire zone creation
    │
    ├── has ──> PlayerManager
    │               │
    │               └── manages ──> Player[] (multiple players)
    │                                   │
    │                                   └── can take damage from ──> Fire zones
    │
    └── has ──> Enemy[] (enemies array)
                    │
                    └── can take damage from ──> Fire zones
```

## Data Structures

### Fire Zone Object
```javascript
{
    x: number,              // Position X
    y: number,              // Position Y
    radius: number,         // Fire zone radius (40px for oil lamps)
    damage: number,         // Damage per second (5 DPS for oil lamps)
    expiresAt: number,      // Timestamp when fire expires
    sprite: Circle,         // Phaser circle sprite (visual)
    particles: Circle[],    // Array of active particle sprites
    particleTimer: Timer,   // Phaser timer event for particle generation
    lastDamageTick: number  // Last time damage was applied
}
```

### Oil Lamp Configuration
```javascript
{
    name: 'Oil Lamp',
    class: 'HazardProp',
    maxHealth: 20,
    width: 15,
    height: 15,
    weightClass: 'light',
    color: 0xFFD700,
    blocksBullets: false,
    onDestroy: 'createFireZone',  // ← Triggers fire zone
    fireRadius: 40,                // ← Fire zone parameters
    fireDuration: 8000,
    fireDamage: 5,
    layer: 'table'
}
```

## Visual Layers (Z-Index / Depth)

```
Layer 100: UI Elements (health bars, text)
Layer 50:  Entity effects (burning particles on entities)
Layer 35:  Ceiling props (chandeliers)
Layer 25:  Destruction particles
Layer 16:  Fire zone particles
Layer 15:  Fire zone circles
Layer 10:  Target reticles
Layer 6:   Table layer props
Layer 5:   Ground layer props (cover)
Layer 4:   Wall layer props
Layer -100: Background (tiled floor)
```

## Update Timing

```
Frame N:
    │
    ├─> GameScene.update(time, delta) called by Phaser
    │       │
    │       └─> time = total game time (ms)
    │       └─> delta = time since last frame (ms, ~16ms at 60fps)
    │
    ├─> EnvironmentManager.update(delta)
    │       │
    │       └─> FireSystem.update(delta)
    │               │
    │               └─> For each fire zone:
    │                       │
    │                       ├─> Check expiration (time.now >= expiresAt)
    │                       │
    │                       └─> Damage tick (every 200ms)
    │                               │
    │                               └─> 200ms accumulation ensures:
    │                                       - 1 damage per tick
    │                                       - 5 ticks per second
    │                                       - 5 DPS total
    │
    └─> Frame N+1 (repeat ~60 times per second)
```

## Performance Characteristics

### Memory Usage
- Fire zone: ~200 bytes (object + sprite references)
- Each particle: ~50 bytes (circle sprite)
- 4 fire zones @ 10 particles each = ~2.8 KB total
- Negligible impact on game memory

### CPU Usage
- Fire zone update: O(n) where n = number of fire zones
- Damage application: O(z * (p + e)) where:
  - z = number of fire zones
  - p = number of players
  - e = number of enemies
- Typical: 3 zones * (2 players + 10 enemies) = 36 distance checks per frame
- Extremely lightweight

### Render Performance
- Each fire zone: 1 circle sprite + 10-15 particle circles
- 4 fire zones = ~60 sprites total
- Phaser batch renderer handles efficiently
- No performance impact observed

## Error Handling

```
EnvironmentProp.createFireZone()
    │
    └─> Check: scene.environmentManager exists?
            │
            ├─> NO: console.warn(), return early
            │
            └─> YES: Check: environmentManager.fireSystem exists?
                        │
                        ├─> NO: console.warn(), return early
                        │
                        └─> YES: Proceed with fire zone creation
```

## Future Extensions (Phase 3.5)

### Fire Spread System
```
FireSystem.update(delta)
    │
    └─> For each fire zone:
            │
            └─> checkFireSpread(fireZone)
                    │
                    └─> Get props in radius
                            │
                            └─> For each flammable prop:
                                    │
                                    ├─> Track exposure time
                                    │
                                    └─> If exposed >= 2 seconds:
                                            │
                                            └─> Create new fire zone at prop
                                                    │
                                                    └─> Chain reaction possible!
```

### Wet Floor System (Leviathan Boss)
```
Water Trough destroyed
    │
    └─> Create wet zone (80px radius)
            │
            └─> If fire zone overlaps:
                    │
                    └─> Extinguish fire
                            │
                            └─> Steam effect (particles)
```

### Electrical Hazards (Leviathan Boss)
```
Lightning attack hits wet floor
    │
    └─> Chain to nearby metal props
            │
            └─> Create electrical zone
                    │
                    └─> Deal electrical damage (1.5x multiplier)
```

## Summary

Phase 3 Fire System:
- ✅ Modular design (separate FireSystem class)
- ✅ Clean integration with existing systems
- ✅ Efficient performance characteristics
- ✅ Extensible for future features
- ✅ Proper lifecycle management
- ✅ Visual effects and feedback
- ✅ No breaking changes to existing code
