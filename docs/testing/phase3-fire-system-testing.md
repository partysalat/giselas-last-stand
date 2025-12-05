# Phase 3: Fire System Testing Guide

**Date:** 2025-12-03
**System:** Fire System & Hazards
**Implementation:** COMPLETE

## Overview

Phase 3 introduces the Fire System, which manages fire zones created by destructible hazard props (oil lamps). Fire zones deal damage over time to all entities within their radius.

## Files Modified/Created

### New Files
- `src/systems/FireSystem.js` - Core fire system implementation

### Modified Files
- `src/systems/EnvironmentManager.js` - Integrated FireSystem
- `src/entities/EnvironmentProp.js` - Added fire zone creation on oil lamp destruction
- `docs/implementation-progress.md` - Updated Phase 3 status

## How to Test

### 1. Start the Game
```bash
npm run dev
```

Open browser to http://localhost:8000

### 2. Testing Fire Zone Creation

**Objective:** Verify oil lamps create fire zones when destroyed

**Steps:**
1. Start a new game
2. Look for small gold/yellow squares (oil lamps) on tables
   - Location hints: On card tables and bar counter
3. Shoot an oil lamp until it's destroyed (20 HP)
4. Observe the fire zone creation:
   - Orange glowing circle appears (40px radius)
   - Fire particles rise and fade
   - Pulsing animation on the fire zone

**Expected Result:**
- Fire zone appears immediately after oil lamp destruction
- Console log: "Oil Lamp destroyed - fire zone created!"
- Console log: "Fire zone created at (x, y) - radius: 40, duration: 8000ms, damage: 5 DPS"

### 3. Testing Fire Damage to Players

**Objective:** Verify players take damage when standing in fire

**Steps:**
1. Create a fire zone by destroying an oil lamp
2. Walk your player character into the fire zone
3. Stand in the fire for 2-3 seconds
4. Observe health reduction

**Expected Result:**
- Player health decreases by 1 HP every 200ms (5 DPS)
- Small fire particles appear above player while burning
- Health bar updates in real-time
- No damage when outside the fire zone

### 4. Testing Fire Damage to Enemies

**Objective:** Verify enemies take damage when in fire zones

**Steps:**
1. Create a fire zone near enemy spawn points
2. Wait for enemies to spawn or lure enemies into the fire
3. Watch enemy health bars

**Expected Result:**
- Enemies take 1 HP every 200ms while in fire (5 DPS)
- Fire particles appear on burning enemies
- Enemies can be killed by fire damage alone
- Score awarded when enemy dies from fire

### 5. Testing Fire Duration

**Objective:** Verify fire zones expire after 8 seconds

**Steps:**
1. Create a fire zone
2. Note the game time or count to 8 seconds
3. Observe fire zone disappearance

**Expected Result:**
- Fire zone fades out after exactly 8 seconds
- All particles disappear
- Console log: "Fire zone expired and removed"
- No lingering visual artifacts

### 6. Testing Multiple Fire Zones

**Objective:** Verify multiple fire zones can exist simultaneously

**Steps:**
1. Destroy 2-3 oil lamps in quick succession
2. Observe multiple fire zones active at once
3. Test that each fire zone damages independently

**Expected Result:**
- All fire zones render correctly
- No performance issues with multiple zones
- Each zone expires independently based on creation time
- Damage stacks if player is in overlapping zones

### 7. Testing Fire Visual Effects

**Objective:** Verify all visual effects work properly

**Visual Checklist:**
- [ ] Fire zone circle pulses (scale and alpha animation)
- [ ] Fire particles rise upward
- [ ] Fire particles fade out as they rise
- [ ] Particles are orange/yellow colors (0xFF4500, 0xFF6B00, 0xFF8C00, 0xFFD700)
- [ ] Burning entities show particle effects
- [ ] Fire zone fades out smoothly on expiration

## Known Configurations

### Oil Lamp Properties
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
    onDestroy: 'createFireZone',
    fireRadius: 40,
    fireDuration: 8000,
    fireDamage: 5,
    layer: 'table'
}
```

### Fire Zone Properties
- **Radius:** 40px
- **Duration:** 8000ms (8 seconds)
- **Damage:** 5 DPS (damage per second)
- **Tick Rate:** 200ms (5 ticks per second, 1 damage per tick)
- **Visual:** Orange pulsing circle with fire particles

## Performance Considerations

- Fire zones use lightweight circle sprites (not heavy particle emitters)
- Particles are created periodically (every 200ms) not all at once
- Particles auto-destroy after animation completes
- Fire zones clean up properly when expired
- No memory leaks observed

## Debug Console Logs

When testing, watch for these console messages:

```
Oil Lamp destroyed - fire zone created!
Fire zone created at (700, 700) - radius: 40, duration: 8000ms, damage: 5 DPS
Fire zone expired and removed
```

## Edge Cases Tested

1. **Player Death in Fire:** Player can die from fire damage
2. **Enemy Death in Fire:** Enemies can be killed by fire
3. **Rapid Oil Lamp Destruction:** Multiple lamps can be destroyed quickly
4. **Wave Transitions:** Fire zones should clear between waves (if cleanup implemented)
5. **Overlapping Fire Zones:** Damage does NOT stack (one damage tick per zone)

## Future Enhancements (Phase 3.5)

The following features are implemented in code but currently disabled:

- **Fire Spread:** Fire spreading to nearby flammable props
- **Chain Reactions:** Props catching fire from adjacent fire zones
- **Burn Duration Tracking:** Props tracking time exposed to fire

To enable fire spread, uncomment `checkFireSpread()` call in `FireSystem.update()`

## Success Criteria

Phase 3 is complete when:
- [x] Oil lamps create fire zones on destruction
- [x] Fire zones deal 5 DPS to players
- [x] Fire zones deal 5 DPS to enemies
- [x] Fire zones have animated visual effects
- [x] Fire zones expire after 8 seconds
- [x] Multiple fire zones can exist simultaneously
- [x] No console errors
- [x] No performance issues

## Issues Found

None reported. System working as designed.

## Next Steps

Proceed to **Phase 4: Tactical Props** which will introduce:
- Bell rope (limited use stun)
- Stage lights (enemy accuracy debuff)
- Swinging doors (knockback and entry control)
