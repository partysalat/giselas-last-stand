# Scavenge & Fortify System

## Overview

Between-waves preparation system where players rearrange furniture and place traps to defend the saloon. Combines creative fortification with tower defense elements.

---

## Core Mechanics

### Between-Waves Phase

**Initial State:**
- Saloon starts with furniture in "normal" positions (bar, tables, piano, etc.)
- After each wave, new items spawn at fixed locations around saloon perimeter

**Player Interaction:**
- Can drag-and-drop ANY item (newly spawned OR existing fortifications)
- Two interaction modes available:
  - Mouse drag-and-drop
  - Pick up and carry with player character
- Unlimited item accumulation (no limits)
- Player-paced: "Press SPACE when ready" to start next wave

**Visual Feedback:**
- Newly spawned items have glow/outline indicator
- Clear visual distinction between movable and static objects

### Combat Phase

**Fortification Behavior:**
- Furniture blocks movement (enemies path around obstacles)
- Enemies can destroy fortifications by attacking them
- Fortifications persist between waves (damage carries over)
- Player can shoot explosive barrels to trigger detonation

**Strategic Elements:**
- Create chokepoints with furniture placement
- Build cover for dodging bullets
- Position explosive barrels for trap combos
- Design defensive layouts that evolve over time

---

## Progressive Item Unlocks

Items unlock based on wave progression, increasing complexity gradually:

### Wave 1-2: Basic Furniture
- Tables
- Chairs
- Barrels (non-explosive)
- Crates

### Wave 3-4: Traps & Explosives
- Explosive barrels (shoot to detonate)
- Bear traps

### Wave 5+: Advanced Items (Future Expansion)
- Oil slicks
- TNT bundles
- Additional trap types
- Specialty fortifications

---

## Spawn System

### Spawn Locations
- 4-6 fixed positions around saloon perimeter
- Locations: doorways, corners, back room entrance
- Items cycle through these predictable positions

### Spawn Rules
- Number of items scales with wave number
- Item types unlock progressively (see Progressive Item Unlocks)
- Spawns occur immediately after wave completion

---

## Item Properties

Each movable item has the following properties:

### Core Properties
- **Position:** X, Y coordinates
- **Collision:** Blocks player and/or enemies
- **Health:** Damage threshold before destroyed
- **Movable:** Can be repositioned by player

### Item-Specific Properties
- **Explosive Barrels:**
  - Shootable trigger
  - Explosion radius
  - Damage value

- **Bear Traps:**
  - Trigger collision
  - Damage value
  - Stun/slow duration

- **Furniture:**
  - Cover effectiveness
  - Durability rating

---

## Implementation Phases

### Phase 1: Basic System
- Between-waves game state
- Mouse drag-and-drop for items
- Basic furniture spawning
- Collision detection
- "Press SPACE when ready" trigger

### Phase 2: Combat Integration
- Enemy pathfinding around obstacles
- Fortification damage/destruction
- Explosive barrel shooting mechanic

### Phase 3: Progressive Unlocks
- Wave-based item spawning logic
- Trap mechanics (bear traps)
- Visual feedback improvements

### Phase 4: Polish & Balance
- Spawn point optimization
- Item variety tuning
- Difficulty scaling
- Player character pick-up/carry mode

---

## Design Goals

✓ **Creative Expression:** Players design their own defensive layouts
✓ **Strategic Depth:** Multiple valid approaches (chokepoints, traps, cover)
✓ **Progressive Complexity:** Start simple, add mechanics gradually
✓ **Tower Defense Feel:** Planning phase + execution phase
✓ **Persistent Fortification:** Builds accumulate and evolve over waves
✓ **Resource Abundance:** "More stuff to work with" over time pressure

---

## Technical Considerations

### Data Structures
- Item registry (spawnable objects)
- Active items array (placed fortifications)
- Spawn point configuration
- Wave-based unlock table

### Game States
- `BETWEEN_WAVES` - Fortification phase
- `WAVE_ACTIVE` - Combat phase
- Transition logic between states

### Collision System
- Movable object collision
- Enemy pathfinding integration
- Projectile interaction (shooting barrels)

### Save/Persistence
- Fortification positions persist between waves
- Damage state carries over
- Progressive unlocks tracked per playthrough