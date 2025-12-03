# Environment System Design - Enhanced Saloon with Dynamic Props

**Date:** 2025-12-03
**Status:** Design Complete - Ready for Implementation
**Scope:** Replace simple 4-type cover system with rich 20+ prop environment featuring hazards, tactics, and physics

## Overview

Transform the basic saloon into a dynamic, interactive battlefield with 20+ prop types that serve as environmental hazards, tactical advantages, and physics-based chaos elements. The environment evolves throughout the game through gradual destruction, boss-triggered events, and wave-based changes.

## Design Goals

- **Visual Richness:** 15-25 props creating authentic saloon atmosphere
- **Strategic Depth:** Multiple interaction types (hazards, tactics, physics)
- **Dynamic Evolution:** Battlefield transforms through destruction and scripted events
- **Full Featured:** Complex behaviors including multi-stage destruction, chained reactions, and special interactions
- **Performance:** Optimized for 40-50 simultaneous props without frame drops

## Core Architecture

### System Components

**Environment Manager**
- Spawns props based on wave/state
- Tracks all active props
- Handles prop-to-prop interactions
- Manages destruction chains
- Updates environmental state

**Fire System**
- Creates fire zones from hazard props
- Spreads fire to flammable objects
- Damages entities in fire zones
- Visual flame effects

**Physics Manager**
- Prop movement and collisions
- Weight-based force calculations
- Knockback and impact damage
- Rolling/sliding behaviors

**Destruction Manager**
- Tracks cumulative saloon damage
- Triggers wave-based changes
- Orchestrates boss-triggered events
- Handles scripted sequences (chandelier falls, trapdoors)

### Prop Categories

**Heavy Cover (High protection, stationary)**
- Bar Counter, Piano, Heavy Bookshelf, Flipped Poker Table, Safe
- 120-250 HP, immovable, full bullet blocking

**Light Cover (Low protection, moveable/destructible)**
- Wooden Chair, Bar Stool, Small Crate, Card Table, Standard Barrel
- 25-60 HP, physics-enabled, partial protection

**Hazard Props (Damage dealers)**
- Oil Lamps (hanging/table), Whiskey Barrel, Dynamite Crate, Gas Lantern
- 20-80 HP, create fire/explosions, area denial

**Tactical Props (Utility/advantage)**
- Swinging Doors, Bell Rope, Stage Curtains, Mirrors, Chandeliers
- 30-100 HP, special abilities (stun, reflect, concealment)

**Special Props (Scripted/environmental)**
- Water Trough, Support Beams, Trapdoors
- Trigger special mechanics or boss interactions

## Complete Prop Roster

### Heavy Cover (5 types)

**1. Bar Counter**
- Health: 200 HP
- Size: 120x50px
- Weight: Heavy (immovable)
- Color: 0x654321 (dark brown)
- Special: Drops bottle debris when destroyed
- Strategic Value: Main defensive position

**2. Piano**
- Health: 150 HP
- Size: 90x60px
- Weight: Heavy
- Color: 0x2F4F4F (dark slate gray)
- Special: Plays discordant notes when hit, strings snap creating small hazard
- Strategic Value: Large cover with audio feedback

**3. Heavy Bookshelf**
- Health: 180 HP
- Size: 100x40px
- Weight: Heavy
- Color: 0x8B4513 (saddle brown)
- Special: Drops books that create slow zones for enemies
- Strategic Value: Crowd control through destruction

**4. Flipped Poker Table**
- Health: 120 HP
- Size: 100x60px
- Weight: Heavy (but repositionable)
- Color: 0x228B22 (forest green felt)
- Special: Can be flipped upright/down for instant repositioning (E key)
- Strategic Value: Mobile heavy cover

**5. Safe**
- Health: 250 HP
- Size: 50x50px
- Weight: Heavy
- Color: 0x708090 (slate gray)
- Special: Indestructible core, drops coins that distract enemies briefly
- Strategic Value: Most durable cover, enemy distraction

### Light Cover (5 types)

**6. Wooden Chair**
- Health: 30 HP
- Size: 30x30px
- Weight: Light
- Color: 0x8B4513 (brown)
- Special: Becomes projectile when knocked at high speed, deals 5 damage on impact
- Strategic Value: Improvised weapon

**7. Bar Stool**
- Health: 25 HP
- Size: 20x20px
- Weight: Light
- Color: 0xA0522D (sienna)
- Special: Lightest prop, rolls continuously when hit
- Strategic Value: Minimal cover, creates movement chaos

**8. Small Crate**
- Health: 40 HP
- Size: 35x35px
- Weight: Light
- Color: 0xDEB887 (burlwood)
- Special: Breaks into sharp splinters (3 damage, short range)
- Strategic Value: Offensive destruction

**9. Card Table**
- Health: 60 HP
- Size: 60x40px
- Weight: Light-Medium
- Color: 0x006400 (dark green)
- Special: Cards scatter when destroyed (visual effect only)
- Strategic Value: Quick temporary cover

**10. Barrel (standard)**
- Health: 50 HP
- Size: 40x40px (circular)
- Weight: Medium
- Color: 0xA0522D (sienna brown)
- Special: Rolls when tilted, blocks movement path
- Strategic Value: Mobile obstacle

### Hazard Props (5 types)

**11. Oil Lamp (hanging)**
- Health: 20 HP
- Size: 15x15px
- Weight: N/A (ceiling-mounted)
- Color: 0xFFD700 (gold)
- Special: Creates 40px radius fire pool directly below, lasts 8 seconds, 5 DPS
- Strategic Value: Ceiling hazard, area denial

**12. Oil Lamp (table)**
- Health: 20 HP
- Size: 15x15px
- Weight: Light
- Color: 0xFFD700 (gold)
- Special: Creates 40px fire pool on table surface, spreads to flammable props
- Strategic Value: Controllable fire placement

**13. Whiskey Barrel**
- Health: 50 HP
- Size: 40x40px
- Weight: Medium
- Color: 0x8B4513 (brown with red tint)
- Special: Explosive (60px radius, 20 damage) + alcohol fire spreads in liquid trail
- Strategic Value: Large area denial through chained fire

**14. Dynamite Crate**
- Health: 80 HP
- Size: 50x50px
- Weight: Medium
- Color: 0xD2691E (chocolate, with red TNT labels)
- Special: Massive explosion (100px radius, 30 damage), triggers nearby explosives
- Strategic Value: Mega-bomb, chain reactions

**15. Gas Lantern**
- Health: 30 HP
- Size: 20x20px
- Weight: Light
- Color: 0xFFFFE0 (light yellow)
- Special: Blinding flash (150px radius, 1 second blind) + small fire (30px, 2 seconds)
- Strategic Value: Crowd control burst

### Tactical Props (5 types)

**16. Swinging Doors**
- Health: 60 HP
- Size: 80x100px
- Weight: N/A (hinged)
- Color: 0x8B4513 (brown)
- Special: Auto-swing closed, knockback on contact, blocks 1-2 bullets
- Strategic Value: Entry control, enemy disruption

**17. Bell Rope**
- Health: 30 HP
- Size: 10x60px
- Weight: N/A (ceiling-mounted)
- Color: 0xCD853F (rope tan)
- Special: Ring bell for 100px AOE stun (0.5 seconds on enemies), 3 uses per wave
- Strategic Value: Emergency crowd control

**18. Stage Curtain**
- Health: 40 HP
- Size: 100x120px
- Weight: N/A (hanging)
- Color: 0x8B0000 (dark red)
- Special: Provides concealment (not protection), burns very easily (fire spreads 2x)
- Strategic Value: Line of sight break, enemy confusion

**19. Mirror**
- Health: 50 HP
- Size: 40x60px
- Weight: N/A (wall-mounted)
- Color: 0xC0C0C0 (silver frame)
- Special: Reflects laser-sight from sniper enemies, shatters into 25px glass shard hazard (3 damage, 4 seconds)
- Strategic Value: Counter specific enemy types

**20. Chandelier**
- Health: 100 HP
- Size: 60x60px
- Weight: Heavy
- Color: 0xFFD700 (gold/crystal)
- Special: 3 stages (Stable → Swaying → Falling), deals 25 AOE damage on impact (50px), darkens area permanently
- Strategic Value: Timing-based hazard, lighting changes

### Special Props (3 types)

**21. Water Trough**
- Health: 100 HP
- Size: 70x40px
- Weight: Heavy
- Color: 0x4682B4 (steel blue)
- Special: Spills water creating 80px wet zone, electrical conductor (damage x1.5 from electrical attacks)
- Strategic Value: Leviathan boss interaction

**22. Support Beam**
- Health: 300 HP
- Size: 30x150px
- Weight: N/A (structural)
- Color: 0x8B4513 (brown)
- Special: Structural element, destruction causes stage tilt/collapse, usually boss-triggered
- Strategic Value: Arena transformation

**23. Trapdoor**
- Health: Invulnerable
- Size: 60x60px (in floor)
- Weight: N/A
- Color: 0x654321 (blends with floor)
- Special: Opens when nearby explosion triggers (80px), enemies fall through (instant kill), players take 15 damage
- Strategic Value: Environmental kill opportunity

## Interactive Behaviors

### Physics-Based Movement

**Weight Classes**

**Lightweight (chairs, stools, bottles, lamps)**
- Knocked by player/enemy contact
- Pushed far by explosions (100-200px)
- Roll/slide on floor creating dynamic hazards
- Deal 3-5 impact damage when colliding

**Medium-weight (tables, crates, barrels)**
- Require direct force to move (explosion, boss slam)
- Can be "flipped" for repositioning (poker table)
- Slide 30-60px when hit
- Deal 8-12 impact damage

**Heavyweight (bar counter, piano, bookshelf, safe)**
- Stationary unless destroyed
- Cannot be moved by normal forces
- May break into medium-weight debris
- Create shockwave when falling (10px knockback)

### Multi-Stage Destruction

**3-Stage Props (most furniture)**
1. **Pristine (100-66% HP)** - Full visual, normal properties, no health bar
2. **Damaged (65-33% HP)** - Cracks/chips visible, reduced effectiveness, health bar appears
3. **Breaking (32-1% HP)** - Barely holding, may collapse randomly, flashing health bar
4. **Destroyed (0% HP)** - Special effect triggers, leaves debris for 5 seconds

**Visual Degradation**
- Alpha reduction: 1.0 → 0.8 → 0.6 → 0.4
- Sprite cracks: None → Minor → Major → Shattered
- Color shift: Normal → Darker → Much darker
- Particle effects increase with damage stage

**2-Stage Props (hazards)**
1. **Intact** - Stable but dangerous if triggered, subtle warning glow
2. **Destroyed** - Immediate effect activation (explosion, fire, flash)

### Fire System

**Fire Zone Properties**
- Damage: 5 HP/second to all entities
- Visual: Animated flame particles, orange glow
- Duration: Varies by source (2-8 seconds)
- Spread: Can ignite adjacent flammable props within 20px
- Pathfinding: Enemies avoid (high cost), players can choose to risk

**Fire Sources & Effects**

| Source | Radius | Duration | Spread Behavior |
|--------|--------|----------|-----------------|
| Oil Lamp | 40px | 8 sec | Spreads to wood props |
| Whiskey Barrel | 60px | 10 sec | Creates trail following liquid |
| Gas Lantern | 30px | 2 sec | Quick burst, no spread |
| Flammable Props | 30px | 5 sec | Chain reaction possible |

**Electrical Hazards (Boss-Specific)**
- Wet floor + electrical attack = 80px AOE shock (15 damage)
- Metal props conduct electricity (piano, safe, mirrors)
- Chaining between metal objects within 50px
- Visual: Blue lightning arcs

### Tactical Interactions

**Bell Rope (Limited Use)**
- Activation: Shoot or touch (E key)
- Effect: 100px radius AOE stun
- Duration: 0.5 seconds on enemies, no effect on bosses
- Uses: 3 per wave before rope snaps
- Cooldown: 2 seconds between rings
- Visual: Bell swings, sound wave particles

**Stage Lights (Directional)**
- Count: 4 lights around stage perimeter
- Activation: Shoot to redirect beam
- Effect: Enemies looking toward light have -30% accuracy
- Shadow zones: Slight concealment (not invisibility)
- Destructible: 40 HP each, sparks when destroyed

**Swinging Doors (Entry Control)**
- Locations: Main entrance, back room
- Behavior: Auto-swing closed after 1 second
- Knockback: 20px push on contact
- Durability: Blocks 1-2 bullets before breaking
- Visual: Western-style saloon doors

**Mirrors (Misdirection)**
- Count: 2-3 on walls
- Effect: Reflects laser-sight targeting from Lobster snipers
- Durability: 50 HP
- Destruction: Shatters into 25px glass hazard zone (3 damage/sec, 4 seconds)
- Visual: Reflective surface, laser beam redirect

## Dynamic Battlefield Changes

### Gradual Destruction Timeline

**Waves 1-3: Pristine Saloon**
- All 30-35 props intact and functional
- 3 chandeliers providing full lighting
- Clean, organized furniture layout
- No environmental hazards active
- Players learn prop interactions safely

**Waves 4-6: Battle Worn**
- Chandelier 1 falls at wave start (random position)
- Permanent dark zone created (20% darker lighting in 150px radius)
- 30% of light cover already damaged from wave 3
- Stage curtains partially torn/burnt
- Back room door unlocks (adds 200x300px area)
- Scorch marks and bullet holes accumulate on walls
- 1 random support beam cracked (visual only)

**Waves 7-8: Heavy Combat**
- Chandelier 2 falls during wave 7
- Balcony railing breaks in 2-3 sections (fall hazard)
- 50% of original furniture destroyed
- Multiple fire scorch zones visible
- Trapdoor 1 opens from structural damage
- Stage platform begins tilting (5° angle)
- Water trough cracks, wet floor appears
- Only heavy cover mostly intact

**Waves 9-10: Apocalyptic**
- Final chandelier unstable (falls if 20+ damage taken)
- Stage platform partially collapsed (30% unusable)
- 70% of light cover destroyed
- Heavy cover at 30-50% health
- 2-3 trapdoors open
- Multiple ceiling beams cracked and dangerous
- Fire damage visible on all walls
- Debris scattered everywhere

### Boss-Triggered Events

**Kraken Boss (Wave 5)**
- **Tentacle Slam:** Destroys all props in 60px impact zone
- **Grab & Throw:** Can pick up medium-weight props and hurl them (50 damage on hit)
- **Wall Smash:** Breaks through back room wall, opens new spawn points
- **Support Beam Crush:** Damages beams causing stage tilt (scripted at 50% health)
- **Ink Cloud:** Darkens area temporarily (no prop destruction)

**Leviathan Phase 1 (Wave 9)**
- **Electrical Surge:** Auto-ignites all oil lamps in arena
- **Tail Sweep:** 180° arc attack knocks all lightweight props across room
- **Coiling Movement:** Crushes furniture in path (medium props take 20 damage)
- **Storm Effect:** Causes chandeliers to sway violently (fall risk)
- **Lightning Strike:** Random prop takes 50 damage every 10 seconds

**Leviathan Phase 2 (Electrical Form)**
- **Metal Electrification:** All metal props (piano, safe, mirrors) become hazards (10 DPS)
- **Lightning Chain:** Strikes metal props creating chain damage to nearby entities
- **Electrical Pool:** Wet floor areas become 5 DPS damage zones
- **Stage Light Explosion:** Lights explode in sequence (scripted), creates glass hazards
- **Conductor Overload:** Support beams spark and catch fire

### Wave-Based Environmental Changes

**Every 2 Waves:**
- 1 random chandelier becomes unstable (if any remain)
- New props spawn in cleared areas (reinforcements)
- Fire zones from previous waves extinguish
- Debris cleaned up (performance)

**Boss Waves (5, 9, 10):**
- Strategic prop placement for boss mechanics
- Fewer light props, more heavy cover
- Hazard props placed near boss spawn
- Escape routes ensured (no total blockages)

**Post-Wave Transitions:**
- Brief pause for environmental reset (1-2 seconds)
- New props fade in (0.5 second tween)
- Damaged props show accumulated wear
- Lighting adjusts based on chandelier count

## Implementation Architecture

### Class Structure

```javascript
// Base class for all environment props
class EnvironmentProp {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.type = type;
        this.loadConfig();
        this.createSprite();
        this.setupPhysics();
    }

    // Core methods
    loadConfig()           // Load from PROP_TYPES
    createSprite()         // Visual representation
    setupPhysics()         // Physics body setup
    takeDamage(amount)     // Damage handling
    updateVisuals()        // Multi-stage degradation
    destroy()              // Destruction + effects
    update(delta)          // Per-frame logic
}

// Specialized behaviors extend base
class DestructibleCover extends EnvironmentProp {
    // Cover-specific logic
    blocksBullets()        // True for bullet collision
    providesProtection()   // Coverage calculation
    getHealthPercent()     // For UI/AI
}

class HazardProp extends EnvironmentProp {
    // Hazard-specific logic
    trigger()              // Activate hazard effect
    createFireZone()       // Fire system integration
    explode()              // Explosion effect
    dealAreaDamage()       // AOE damage calculation
}

class TacticalProp extends EnvironmentProp {
    // Tactical-specific logic
    activate()             // Player/enemy activation
    getCooldown()          // Usage limiting
    checkUsesRemaining()   // Limited use tracking
    applyEffect()          // Special effect application
}

class PhysicsProp extends EnvironmentProp {
    // Physics-specific logic
    applyForce(x, y)       // Movement from impact
    checkCollision()       // Impact detection
    dealImpactDamage()     // Collision damage
    updateMovement()       // Rolling/sliding physics
}

class DynamicProp extends EnvironmentProp {
    // Scripted behavior
    playAnimation()        // Multi-stage animations
    triggerEvent()         // Boss/wave events
    transformState()       // Stage-based changes
}
```

### Manager Systems

```javascript
class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.props = [];
        this.fireZones = [];
        this.layout = null;
        this.destructionLevel = 0;
    }

    // Core management
    initialize(waveNumber)        // Setup for wave
    spawnProps(layout)            // Create prop instances
    update(delta)                 // Update all props
    cleanup()                     // Remove destroyed props

    // Interaction handling
    checkBulletCollision(bullet)  // Bullet-prop collision
    checkEntityCollision(entity)  // Entity-prop collision
    handlePropDestruction(prop)   // Chain reactions

    // State management
    getDestructionLevel()         // 0-100 based on damage
    trackCumulativeDamage()       // Total saloon damage
    triggerWaveTransition()       // Environmental changes
    handleBossEvent(eventType)    // Boss-triggered effects
}

class FireSystem {
    constructor(scene) {
        this.scene = scene;
        this.fireZones = [];
    }

    createFireZone(x, y, radius, duration, source) {
        // Create fire zone instance
        // Add to tracking array
        // Start damage ticks
        // Create visual effects
    }

    update(delta) {
        // Update all active fire zones
        // Deal damage to entities in fire
        // Check for spread to flammable props
        // Remove expired zones
    }

    checkFireSpread(fireZone) {
        // Find flammable props within range
        // Ignite if conditions met
        // Create new fire zones
    }

    dealFireDamage(entity, fireZone) {
        // Calculate damage based on time in fire
        // Apply damage to entity
        // Visual feedback (burning effect)
    }
}

class PhysicsManager {
    constructor(scene) {
        this.scene = scene;
        this.movingProps = [];
    }

    applyForce(prop, forceX, forceY) {
        // Check weight class
        // Calculate movement distance
        // Apply velocity to prop
        // Add to moving props array
    }

    update(delta) {
        // Update all moving props
        // Check collisions during movement
        // Apply friction/slowdown
        // Remove stopped props from array
    }

    handlePropCollision(prop, target) {
        // Calculate impact damage
        // Apply damage to target
        // Bounce/stop prop
        // Visual/audio feedback
    }
}

class DestructionManager {
    constructor(scene) {
        this.scene = scene;
        this.destructionLevel = 0;
        this.chandeliersRemaining = 3;
        this.trapdoorsOpened = [];
    }

    trackDamage(prop, damage) {
        // Add to cumulative damage
        // Update destruction level (0-100)
        // Check for destruction milestones
        // Trigger environmental changes if needed
    }

    triggerChandelierFall(index) {
        // Get chandelier reference
        // Play fall animation
        // Deal impact damage
        // Create dark zone
        // Update lighting
    }

    openTrapdoor(x, y) {
        // Create trapdoor instance
        // Check for entities above
        // Apply fall damage/death
        // Add to opened array
    }

    handleBossEvent(bossType, eventType, data) {
        // Route to appropriate handler
        // Apply environmental changes
        // Trigger scripted sequences
    }
}
```

### Prop Configuration

```javascript
// Centralized prop definitions
export const PROP_TYPES = {
    barCounter: {
        name: 'Bar Counter',
        class: 'DestructibleCover',
        maxHealth: 200,
        width: 120,
        height: 50,
        weightClass: 'heavy',
        color: 0x654321,
        blocksBullets: true,
        onDestroy: 'spawnBottleDebris',
        layer: 'ground'
    },

    oilLamp: {
        name: 'Oil Lamp',
        class: 'HazardProp',
        maxHealth: 20,
        width: 15,
        height: 15,
        weightClass: 'light',
        color: 0xFFD700,
        onDestroy: 'createFireZone',
        fireRadius: 40,
        fireDuration: 8000,
        fireDamage: 5,
        layer: 'table'  // or 'ceiling'
    },

    bellRope: {
        name: 'Bell Rope',
        class: 'TacticalProp',
        maxHealth: 30,
        width: 10,
        height: 60,
        weightClass: null,
        color: 0xCD853F,
        onActivate: 'stunEnemies',
        stunRadius: 100,
        stunDuration: 500,
        maxUses: 3,
        cooldown: 2000,
        layer: 'ceiling'
    },

    woodenChair: {
        name: 'Wooden Chair',
        class: 'PhysicsProp',
        maxHealth: 30,
        width: 30,
        height: 30,
        weightClass: 'light',
        color: 0x8B4513,
        impactDamage: 5,
        impactSpeed: 100,
        friction: 0.95,
        layer: 'ground'
    },

    chandelier: {
        name: 'Chandelier',
        class: 'DynamicProp',
        maxHealth: 100,
        width: 60,
        height: 60,
        weightClass: 'heavy',
        color: 0xFFD700,
        stages: ['stable', 'swaying', 'falling'],
        fallDamage: 25,
        fallRadius: 50,
        darkenRadius: 150,
        layer: 'ceiling'
    }

    // ... all 23 props defined here
};
```

### Layout System

```javascript
class SaloonLayout {
    constructor(scene, variant = 'default') {
        this.scene = scene;
        this.variant = variant;
        this.spawnZones = [];
        this.propPlacements = [];
    }

    generate(waveNumber) {
        // Clear previous layout
        this.propPlacements = [];

        // Select layout based on wave and variant
        if (waveNumber <= 3) {
            this.generateEarlyLayout();
        } else if (waveNumber <= 6) {
            this.generateMidLayout();
        } else if (waveNumber <= 8) {
            this.generateLateLayout();
        } else {
            this.generateBossLayout();
        }

        // Ensure spawn zones are clear
        this.clearSpawnZones();

        return this.propPlacements;
    }

    generateEarlyLayout() {
        // 25-30 props: Learning phase
        // Focus on heavy cover and safe exploration

        // Central bar counter
        this.addProp('barCounter', 400, 300);

        // Corner heavy cover
        this.addProp('piano', 150, 150);
        this.addProp('heavyBookshelf', 650, 150);

        // Scattered light cover
        for (let i = 0; i < 8; i++) {
            this.addProp('woodenChair', random(), random());
        }

        // Few hazards (learning)
        this.addProp('oilLamp', 400, 150, 'table');
        this.addProp('barrel', 300, 400);

        // Tactical elements
        this.addProp('bellRope', 400, 100, 'ceiling');
        this.addProp('mirror', 100, 300, 'wall');

        // Chandeliers
        this.addProp('chandelier', 250, 250, 'ceiling');
        this.addProp('chandelier', 550, 250, 'ceiling');
        this.addProp('chandelier', 400, 400, 'ceiling');
    }

    generateMidLayout() {
        // 35-40 props: Full environment
        // More hazards, complex tactical options
        // [Similar structure with different composition]
    }

    generateLateLayout() {
        // 20-30 props: Many destroyed
        // Sparse cover, more hazards
        // Arena more open and dangerous
        // [Similar structure with different composition]
    }

    generateBossLayout() {
        // 30-35 props: Strategic placement
        // Consider boss mechanics
        // Ensure engagement space
        // [Similar structure with different composition]
    }

    addProp(type, x, y, layer = 'ground') {
        this.propPlacements.push({
            type: type,
            x: x,
            y: y,
            layer: layer
        });
    }

    clearSpawnZones() {
        // Remove props that overlap with spawn zones
        // Ensure enemies don't spawn inside furniture
    }

    // Layout variants for replayability
    static VARIANTS = ['default', 'symmetric', 'asymmetric', 'chaotic'];
}
```

## Collision & Pathfinding

### Bullet Collision Priority

1. **Player/Enemy hits** - Check first (highest priority)
2. **Environment props** - Check second
3. **Walls/boundaries** - Check last (fallback)

**Prop Blocking Rules:**
- Heavy cover: 100% block bullets
- Light cover: Block until destroyed
- Tactical props: Varies per type
  - Swinging doors: Block
  - Stage curtains: Don't block
  - Mirrors: Block and may reflect
- Hazard props: Block and may trigger

### Enemy Pathfinding Integration

**Avoidance Behaviors:**
- Fire zones: Very high pathfinding cost (enemies route around)
- Trapdoors: Infinite cost when open (enemies never path through)
- Explosive props: Moderate cost when low health (cautious)

**Strategic Use:**
- Heavy cover: Enemies peek around corners, use for protection
- Tactical retreat: Enemies path behind cover when low health
- Boss navigation: Bosses ignore most obstacles (crush through)

**Flying Enemies:**
- Ignore ground-level props entirely
- Avoid ceiling-mounted props (chandeliers, lamps)
- Still affected by fire zones (take damage)

### Player Interaction Methods

**Explicit Actions (button press)**
- `E` key activations:
  - Flip poker table (when standing near)
  - Ring bell rope (when in range)
  - Activate trapdoor manually (special)
- Shooting: All props can be targeted and damaged

**Implicit Actions (automatic)**
- Movement: Knocks lightweight props
- Contact: Swinging doors trigger automatically
- Proximity: Interactive props highlight when near
- Cover: Automatic protection calculation behind props

## Visual & Audio Feedback

### Visual Feedback Systems

**Damage Indication:**
- Damage numbers pop from props (white text, +10)
- Health bars appear when first damaged
  - Green (100-50%), Yellow (50-25%), Red (25-0%)
  - Fade out 2 seconds after last damage
- Visual degradation through damage stages (cracks, darkness, alpha)

**Interactive Highlights:**
- Props with explicit actions glow subtly when player nearby (15px)
- Color: Yellow outline for tactical, white for interactive
- Pulse animation (0.8-1.0 alpha, 1 second cycle)

**Color Coding:**
- **Brown tones (0x8B4513):** Standard cover, furniture
- **Red/Orange (0xFF4500):** Explosive hazards, danger
- **Yellow/Gold (0xFFD700):** Fire sources, lights
- **Blue/White (0x87CEEB):** Tactical/utility props
- **Gray (0x708090):** Metal/durable props

**Effect Layers:**
- Background: Floor, walls
- Ground props: Furniture, cover (depth 1-10)
- Entities: Players, enemies (depth 10-20)
- Effects: Fire, explosions (depth 20-30)
- Ceiling props: Chandeliers, lamps (depth 30-40)
- UI: Health bars, text (depth 100+)

### Audio Cues (Future)

**Destruction Sounds:**
- Wood: Crack/splinter
- Glass: Shatter/tinkle
- Metal: Clang/scrape
- Explosive: Boom with bass

**Material-Based:**
- Each prop type has distinct sound
- Volume based on prop size
- Pitch variation for variety

**Environmental Ambience:**
- Fire: Crackling loop
- Bell: Clear ring with reverb
- Chandelier: Metallic creak before fall
- Doors: Saloon-style swing squeak

## Performance Optimization

### Technical Constraints

**Maximum Limits:**
- 40-50 props active simultaneously
- 10 fire zones maximum
- 8 moving props at once
- 3 active destruction sequences

**Memory Management:**
- Destroyed props leave simple sprite debris (not full objects)
- Debris despawns after 5 seconds
- Fire zones use single area effect, not per-particle damage
- Pooling system for common props (chairs, barrels)

**Calculation Optimization:**
- Prop interactions only calculated when entities nearby (100px radius)
- Pathfinding updates only when props destroyed/moved
- Visual effects culled when off-screen
- Physics updates only for moving props

### Spawn Density by Wave

| Wave Range | Prop Count | Composition |
|------------|------------|-------------|
| 1-3 | 25-30 | 40% heavy, 40% light, 10% hazard, 10% tactical |
| 4-6 | 35-40 | 30% heavy, 35% light, 20% hazard, 15% tactical |
| 7-8 | 20-30 | 35% heavy, 25% light, 25% hazard, 15% tactical |
| 9-10 (Boss) | 30-35 | 45% heavy, 20% light, 20% hazard, 15% tactical |

**Reasoning:**
- Early: More props for learning, forgiving
- Mid: Full density for richest experience
- Late: Many destroyed, intentionally sparse
- Boss: Strategic placement for mechanics

### Performance Profiling Targets

- Frame time: <16ms (60 FPS)
- Prop update loop: <2ms
- Collision checks: <3ms
- Fire system: <1ms
- Physics updates: <2ms
- Total environment overhead: <8ms (leaves 8ms for game logic)

## Replayability Features

### Layout Variations

**4 Layout Variants:**

**1. Default** - Balanced furniture distribution, central bar
**2. Symmetric** - Mirror layout left/right, orderly
**3. Asymmetric** - Clustered furniture, open spaces, chaotic
**4. Chaotic** - Random placement, unpredictable

**Randomization Elements:**
- Hazard prop placement (different each run)
- Chandelier positions (3 of 5 possible locations)
- Tactical prop selection (2-3 of 5 types per run)
- Light cover scatter (random positions within zones)

**Selection Logic:**
- First playthrough: Always 'default'
- Subsequent runs: Random variant
- Difficulty affects density within variant

### Difficulty Scaling

**Easy Mode:**
- +20% heavy cover count
- -30% hazard props
- Props have +50% health
- Fire zones 20% smaller
- Explosions 25% less damage
- More tactical props available

**Normal Mode:**
- Baseline configuration as designed
- Balanced prop distribution
- Standard health/damage values

**Hard Mode:**
- -20% heavy cover count
- +30% hazard props
- Props have -30% health
- Fire zones 20% larger
- Explosions 25% more damage
- Fewer tactical props (1-2 instead of 3-4)

**Masochist Mode (Future):**
- Minimal cover
- Maximum hazards
- Props 1-shot by bosses
- Fire spreads 2x faster
- No tactical props

## Integration with Existing Systems

### WaveManager Integration

```javascript
// In WaveManager.js
startWave(waveNumber) {
    // Existing wave start logic...

    // NEW: Trigger environmental changes
    this.scene.environmentManager.prepareForWave(waveNumber);

    // If boss wave, configure environment
    if (this.isBossWave(waveNumber)) {
        this.scene.environmentManager.setupBossArena(this.getBossType(waveNumber));
    }
}

onWaveComplete() {
    // Existing completion logic...

    // NEW: Cleanup and transition
    this.scene.environmentManager.transitionToNextWave();
}
```

### Enemy AI Integration

```javascript
// In Enemy.js
updateMovement(delta) {
    // Existing movement...

    // NEW: Check for fire avoidance
    const nearbyFire = this.scene.environmentManager.fireSystem.checkNearbyFire(this.x, this.y);
    if (nearbyFire) {
        this.adjustPathForFire(nearbyFire);
    }

    // NEW: Use cover strategically
    if (this.health < this.maxHealth * 0.3) {
        const cover = this.scene.environmentManager.findNearestCover(this.x, this.y);
        if (cover) {
            this.moveTowardsCover(cover);
        }
    }
}
```

### Player Collision

```javascript
// In Player.js
update(delta) {
    // Existing update...

    // NEW: Check for prop interactions
    this.scene.environmentManager.checkPlayerInteraction(this);

    // NEW: Highlight nearby tactical props
    this.scene.environmentManager.updateInteractionHighlights(this.x, this.y);
}
```

### Boss Integration

```javascript
// In Enemy.js (boss-specific)
performSpecialAttack() {
    if (this.type === 'kraken') {
        // Existing tentacle slam...

        // NEW: Destroy props in radius
        this.scene.environmentManager.destroyPropsInRadius(this.attackX, this.attackY, 60);
    }

    if (this.type === 'leviathan' && this.phase === 2) {
        // NEW: Electrify metal props
        this.scene.environmentManager.electrifyMetalProps();
    }
}
```

## Implementation Phases

### Phase 1: Core System (Foundation)
- Create base `EnvironmentProp` class
- Implement `EnvironmentManager`
- Create 5 basic prop types (bar, table, chair, barrel, lamp)
- Basic collision detection
- Simple destruction effects
- **Goal:** Replace existing Cover.js system

### Phase 2: Physics & Movement
- Implement `PhysicsManager`
- Weight class system
- Knockback and impact damage
- Rolling/sliding props
- Collision damage
- **Goal:** Props react to forces dynamically

### Phase 3: Hazards & Fire
- Implement `FireSystem`
- All 5 hazard prop types
- Fire zones and spread mechanics
- Explosion chain reactions
- Enemy pathfinding integration
- **Goal:** Environmental danger fully functional

### Phase 4: Tactical Props
- All 5 tactical prop types
- Bell rope, mirrors, doors, curtains, lights
- Activation systems
- Limited uses and cooldowns
- Player interaction UI
- **Goal:** Strategic options available

### Phase 5: Dynamic Events
- Implement `DestructionManager`
- Chandelier falling system
- Multi-stage prop degradation
- Wave-based transitions
- Destruction timeline
- **Goal:** Saloon evolves through waves

### Phase 6: Boss Integration
- Boss-triggered events
- Kraken wall smash
- Leviathan electrical effects
- Support beam destruction
- Scripted sequences
- **Goal:** Bosses interact with environment

### Phase 7: Polish & Optimization
- Complete prop roster (all 23 types)
- Visual effects for all destruction
- Performance optimization
- Layout variations
- Difficulty scaling
- **Goal:** Production-ready system

## Testing & Validation

### Core Functionality Tests

**Prop Destruction:**
- [ ] All prop types can be damaged and destroyed
- [ ] Health bars appear and update correctly
- [ ] Multi-stage degradation visuals work
- [ ] Destruction effects trigger appropriately
- [ ] Debris spawns and despawns correctly

**Physics & Movement:**
- [ ] Lightweight props knocked by movement
- [ ] Medium props react to explosions
- [ ] Rolling/sliding behaves realistically
- [ ] Impact damage dealt correctly
- [ ] Props stop when friction applied

**Fire System:**
- [ ] Fire zones created from hazard props
- [ ] Fire damage dealt per second
- [ ] Fire spreads to flammable props
- [ ] Fire zones expire after duration
- [ ] Multiple fire zones don't overlap incorrectly

**Tactical Props:**
- [ ] Bell rope stuns enemies in radius
- [ ] Mirrors reflect laser sights
- [ ] Swinging doors knockback on contact
- [ ] Stage lights affect enemy accuracy
- [ ] Curtains provide concealment

**Boss Events:**
- [ ] Kraken destroys props with attacks
- [ ] Leviathan electrifies metal props
- [ ] Support beams trigger stage changes
- [ ] Chandelier falls occur correctly
- [ ] Trapdoors open and function

### Performance Tests

- [ ] 50 props at 60 FPS
- [ ] 10 simultaneous fire zones
- [ ] 8 moving props without lag
- [ ] Boss event performance acceptable
- [ ] Memory usage stable over 10 waves

### Integration Tests

- [ ] Enemy pathfinding avoids fire
- [ ] Enemies use cover strategically
- [ ] Player collision works with all props
- [ ] Bullet collision priority correct
- [ ] Wave transitions smooth

### Balance Tests

- [ ] Cover provides meaningful protection
- [ ] Hazards threaten but not unfair
- [ ] Tactical props useful but not overpowered
- [ ] Destruction timeline feels natural
- [ ] Boss events enhance not frustrate

## Future Enhancements

### Post-Launch Features

**Environmental Combos:**
- Shoot barrel into fire for double explosion
- Use bell rope to drop chandelier on stunned enemies
- Electrified water + oil fire = superheated steam cloud

**Advanced Physics:**
- Ragdoll enemies knocked by heavy props
- Prop stacking (table on table for tall cover)
- Destructible walls (late-wave arena expansion)

**Interactive Set Pieces:**
- Rotating stage platform (controlled by player)
- Pullable chandeliers (aimed drop)
- Flippable floor sections (manual trapdoors)

**Environmental Weapons:**
- Pick up and throw small props
- Use bell rope as grapple point
- Shoot props to redirect toward enemies

**Procedural Destruction:**
- Props deform based on damage location
- Realistic breaking patterns
- Persistent damage across waves

**Audio System:**
- Material-based sound effects
- 3D positional audio
- Dynamic music responds to destruction level
- Environmental ambience loops

## Art & Visual Design

### Sprite Requirements

**Prop Sprites (per type):**
- 3-4 damage stages
- Debris variants (3-5 pieces)
- Special effect frames if animated

**Effect Sprites:**
- Fire animation (4-6 frames)
- Explosion animation (8-10 frames)
- Smoke/dust particles
- Glass shatter effect
- Electrical arc animation

**UI Elements:**
- Interaction prompt icons
- Health bar graphics
- Damage number font
- Warning indicators (hazard nearby)

### Color Palette

**Wood Tones:**
- Light wood: 0xDEB887 (burlwood)
- Medium wood: 0x8B4513 (saddle brown)
- Dark wood: 0x654321 (dark brown)

**Metal:**
- Steel: 0x708090 (slate gray)
- Gold: 0xFFD700 (gold)
- Iron: 0x2F4F4F (dark slate)

**Hazards:**
- Fire: 0xFF4500 (orange red)
- Explosion: 0xFF8C00 (dark orange)
- Electricity: 0x00BFFF (deep sky blue)

**Effects:**
- Glow: 0xFFFFE0 (light yellow)
- Smoke: 0x696969 (dim gray, alpha 0.5)
- Glass: 0xE0FFFF (light cyan, alpha 0.6)

### Animation Style

**Destruction:**
- Quick, snappy (0.2-0.4 seconds)
- Exaggerated particle spread
- Screen shake for heavy impacts

**Fire:**
- Looping flame flicker (0.5 sec cycle)
- Upward particle drift
- Subtle glow pulse

**Physics Movement:**
- Smooth interpolation
- Rotation during movement
- Bouncing on impact

## Summary

This environment system transforms the saloon from a static backdrop into a dynamic, reactive battlefield. With 20+ interactive prop types spanning cover, hazards, tactics, and physics, players will experience emergent gameplay moments that make each wave feel unique.

The gradual destruction timeline and boss-triggered events ensure the environment evolves alongside the combat intensity, creating memorable "the saloon is falling apart around us" moments. The system is designed for expansion, with clear architecture for adding new prop types, effects, and interactions in future updates.

**Key Differentiators:**
- Multi-stage destruction (not just instant)
- Physics-based chaos (moveable props)
- Environmental combos (fire + explosion + physics)
- Boss-environment interaction (not just backdrop)
- Strategic depth (cover, hazards, tactics all viable)

This design prioritizes player agency—the environment reacts to player choices, not just scripted events. Every prop destroyed, every fire started, every tactical prop used is a player-driven moment that affects the battlefield state.

**Ready for implementation planning.**
