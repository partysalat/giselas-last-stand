# Phase 5: Dynamic Events - Testing Guide

## Overview
Phase 5 implements the Dynamic Events system with chandelier falling, multi-stage prop degradation, and wave-based environmental changes.

## What Was Implemented

### 1. DestructionManager Class
**Location:** `/src/systems/DestructionManager.js`

**Features:**
- Tracks cumulative destruction level (0-100)
- Manages 3 chandeliers with 3-stage system (stable → swaying → falling)
- Handles trapdoor opening
- Triggers environmental changes based on wave number
- Destruction timeline:
  - Waves 1-3: Pristine
  - Waves 4-6: Battle worn (chandelier 1 falls at wave 4)
  - Waves 7-8: Heavy combat (chandelier 2 falls at wave 7)
  - Waves 9-10: Apocalyptic (chandelier 3 unstable at wave 9)

### 2. Chandelier System
**Location:** `/src/entities/EnvironmentProp.js` (chandelier prop type + methods)

**Features:**
- 3 chandeliers spawn at the start (left, center, right)
- Each has 100 HP
- Three states:
  - **Stable:** Normal appearance, no animation
  - **Swaying:** Gentle rotation animation, red warning indicator
  - **Falling:** Drops down with spinning animation
- Fall damage: 25 in 50px radius
- Creates permanent dark zone (150px radius, 30% darker)
- Camera shake on impact
- Debris particles left behind

**Chandelier Positions:**
- Left: (500, 200)
- Center: (960, 250)
- Right: (1420, 200)

### 3. Multi-Stage Visual Degradation
**Location:** `/src/entities/EnvironmentProp.js` - `updateVisuals()` method

**Stages:**
1. **Pristine (100-66% HP):**
   - Full opacity (alpha: 1.0)
   - No health bar shown initially
   - Normal appearance

2. **Damaged (65-33% HP):**
   - Reduced opacity (alpha: 0.8)
   - Health bar appears (green → yellow)
   - Darker border (damage cracks visual)

3. **Breaking (32-1% HP):**
   - Very transparent (alpha: 0.6)
   - Red tint applied
   - Flashing health bar (pulsing animation)

4. **Destroyed (0% HP):**
   - Destruction particles
   - Special effects based on prop type
   - Debris left behind

### 4. Wave-Based Environmental Changes
**Location:** `/src/systems/DestructionManager.js` - `initializeForWave()`

**Timeline:**
- **Wave 4:** First chandelier enters swaying state, then falls after 2 seconds
- **Wave 7:** Second chandelier enters swaying state, then falls after 2 seconds
- **Wave 9+:** Third chandelier becomes unstable (will fall if damaged below 20% HP)

## How to Test

### Test 1: Chandelier Falling at Wave 4
**Steps:**
1. Start a new game
2. Play through waves 1-3 (all 3 chandeliers should be visible and stable)
3. Complete wave 3 and let wave 4 start
4. **Expected:** At the start of wave 4:
   - One chandelier (first registered) should start swaying
   - After 2 seconds, it should fall down with spinning animation
   - Camera should shake on impact
   - Dark zone should appear where it fell
   - Enemies/players in 50px radius should take 25 damage

**Console Output to Look For:**
```
DestructionManager: Wave 4, Phase: battle_worn
Wave 4: Triggering first chandelier fall
Chandelier state changed to: swaying
Chandelier falling at (X, Y)
Chandelier impact at (X, Y)
Creating dark zone at (X, Y), radius: 150
```

### Test 2: Chandelier Falling at Wave 7
**Steps:**
1. Continue from wave 4 to wave 7
2. Watch for the second chandelier to fall at the start of wave 7
3. **Expected:**
   - Second chandelier should sway and fall
   - Another dark zone should be created
   - Two chandeliers should now be fallen, one remaining

**Console Output to Look For:**
```
DestructionManager: Wave 7, Phase: heavy_combat
Wave 7: Triggering second chandelier fall
```

### Test 3: Unstable Chandelier at Wave 9+
**Steps:**
1. Continue to wave 9
2. Shoot the remaining chandelier
3. **Expected:**
   - Chandelier should enter swaying state immediately at wave start
   - When shot below 20% HP, it should fall immediately
   - Console: "Unstable chandelier damaged below 20% HP - triggering fall!"

**Console Output to Look For:**
```
DestructionManager: Wave 9, Phase: apocalyptic
Wave 9+: Final chandelier is now unstable
Chandelier state changed to: swaying
Unstable chandelier damaged below 20% HP - triggering fall!
```

### Test 4: Multi-Stage Visual Degradation
**Steps:**
1. Start wave 1
2. Shoot any prop (cardTable, barCounter, woodenChair, etc.)
3. **Expected:**
   - **100-66% HP:** Full opacity, no health bar
   - **65-33% HP:** Health bar appears, alpha reduces to 0.8
   - **32-1% HP:** Red tint, flashing health bar, alpha 0.6
   - **0% HP:** Destruction particles and debris

**What to Watch:**
- Health bar color: Green → Yellow → Red
- Prop transparency: 1.0 → 0.8 → 0.6
- Flashing effect starts when below 33% HP

### Test 5: Dark Zones
**Steps:**
1. Let a chandelier fall (wave 4 or 7)
2. Walk into the dark zone
3. **Expected:**
   - Dark circular area on the ground (150px radius)
   - 30% darker than surrounding area
   - Persistent (doesn't fade)
   - Multiple dark zones from multiple chandeliers

### Test 6: Destruction Level Tracking
**Steps:**
1. Shoot various props throughout waves
2. Check console for destruction tracking
3. **Expected:**
   - Destruction level increases as props are damaged
   - Console shows cumulative damage tracking
   - Environmental phase changes based on wave number

**Console Output:**
```
DestructionManager: Wave X, Phase: [pristine|battle_worn|heavy_combat|apocalyptic]
```

## Debugging

### Common Issues

**Issue 1: Chandeliers don't spawn**
- Check: `/src/systems/EnvironmentManager.js` - `spawnPropsForWave()`
- Verify chandelier entries in propLayout array
- Check console for "Registered chandelier" messages

**Issue 2: Chandeliers don't fall at correct waves**
- Check: `/src/systems/DestructionManager.js` - `handleChandelierFalling()`
- Verify wave number is being passed correctly
- Check console for "Triggering chandelier fall" messages

**Issue 3: Visual degradation not working**
- Check: `/src/entities/EnvironmentProp.js` - `updateVisuals()`
- Verify health percentage calculations
- Check if health bar is being created properly

**Issue 4: Dark zones not appearing**
- Check: `/src/entities/EnvironmentProp.js` - `createDarkZone()`
- Verify scene.darkZones array is being created
- Check depth ordering (should be 2)

### Console Commands for Testing

Open browser console while game is running:

```javascript
// Get current destruction level
scene.environmentManager.destructionManager.getDestructionLevel()

// Get current environment phase
scene.environmentManager.destructionManager.getEnvironmentPhase()

// Get all chandeliers
scene.environmentManager.destructionManager.chandeliers

// Manually trigger chandelier fall
scene.environmentManager.destructionManager.triggerChandelierFall(0)

// Get all props
scene.environmentManager.getProps()

// Count alive props
scene.environmentManager.getProps().filter(p => p.isAlive()).length
```

## Success Criteria

- ✅ 3 chandeliers spawn at start of game
- ✅ First chandelier falls at wave 4
- ✅ Second chandelier falls at wave 7
- ✅ Third chandelier becomes unstable at wave 9
- ✅ Chandeliers deal 25 damage in 50px radius on impact
- ✅ Dark zones created where chandeliers fall (150px radius)
- ✅ Props show visual degradation: pristine → damaged → breaking
- ✅ Health bars hidden at full health, appear when damaged
- ✅ Health bars flash red when below 33% HP
- ✅ Destruction level tracked across all prop damage
- ✅ Environment phases change based on wave number
- ✅ Camera shakes on chandelier impact
- ✅ Debris particles created on chandelier fall

## Known Limitations

1. **Boss Integration:** Boss-triggered events are implemented but need boss classes to call them
2. **Trapdoors:** Trapdoor opening is implemented but not automatically triggered (needs boss integration)
3. **Sprites:** Using placeholder colored rectangles instead of actual sprites
4. **Audio:** No sound effects yet (would need audio assets)

## Next Steps (Future Phases)

- **Phase 6:** Boss integration with environment
  - Kraken tentacle slams open trapdoors
  - Leviathan electrical surge causes chandelier swaying
- **Phase 7:** Complete prop roster (20+ prop types)
- **Add visual sprites:** Replace rectangles with actual art assets
- **Add audio:** Sound effects for falling, impacts, destruction
- **Layout variations:** Multiple arena layouts for replayability

## Files Modified

1. **NEW:** `/src/systems/DestructionManager.js` - Main destruction tracking system
2. **MODIFIED:** `/src/entities/EnvironmentProp.js` - Added chandelier prop type and fall methods, enhanced visual degradation
3. **MODIFIED:** `/src/systems/EnvironmentManager.js` - Integrated DestructionManager, added chandelier spawning
4. **MODIFIED:** `/src/systems/WaveManager.js` - Added wave transition hooks for environmental changes
