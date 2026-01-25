# Automatic Prop Placement System Design

**Date:** 2026-01-25
**Status:** Design Complete - Ready for Implementation

## Overview

Remove the interactive drag-and-drop furniture system between waves. Replace it with automatic strategic prop placement that happens instantly via a "supply drop" event. Props spawn in defensive ring patterns that progressively tighten as waves advance.

## Problem Statement

The current castle-building mechanic between waves is distracting. Players must manually drag furniture into defensive positions, which interrupts the game's combat flow and pulls focus away from the core twin-stick shooter gameplay.

## Solution: Automatic Strategic Placement

### Core Concept

**Player Experience:**
- Wave ends → brief moment of relief
- Simple notification: "Furniture delivered!"
- Props instantly appear at strategic positions (1-2 seconds)
- No player input required
- Players can immediately prepare for next wave

**Strategic Philosophy:**
Props form a defensive ring around the saloon center that creates:
- Protective perimeter for players
- Natural choke points for enemy funneling
- Cover positions for shooting
- Clear sightlines between defensive positions

**Progressive Tightening:**
- Waves 1-3: Wide outer ring (near playable area edges)
- Waves 4-6: Middle ring (second defensive layer)
- Waves 7-9: Inner ring (tight defense close to center)
- Waves 10+: Core ring (final stand, dense fortifications)

This creates escalating intensity as the defensive arena shrinks while waves get harder.

## Technical Implementation

### 1. Remove Drag System

Delete from `FortificationManager.js`:
- `makeDraggable()` method (lines 301-326)
- `onDragStart()` method (lines 330-369)
- `onDrag()` method (lines 373-456)
- `onDragEnd()` method (lines 460-546)
- `enablePropDragging()` method (lines 656-663)
- `disablePropDragging()` method (lines 669-677)
- `isValidPlacement()` method (lines 604-633)

### 2. Ring-Based Placement System

Replace `spawnPoints` array with defensive ring configuration:

```javascript
// In FortificationManager constructor
this.defensiveRings = [
  { radius: 12, waves: [1, 2, 3], propCount: 8 },      // Outer ring
  { radius: 8, waves: [4, 5, 6], propCount: 10 },      // Middle ring
  { radius: 5, waves: [7, 8, 9], propCount: 12 },      // Inner ring
  { radius: 3, waves: [10, 11, 12], propCount: 8 }     // Core ring
];

this.saloonCenter = { worldX: 15, worldY: 12 }; // Center of world space
```

**Position Calculation:**
For each ring, calculate evenly-spaced positions around circumference:

```javascript
calculateRingPositions(ring) {
  const positions = [];
  const { radius, propCount } = ring;

  for (let i = 0; i < propCount; i++) {
    const angle = (i / propCount) * Math.PI * 2;
    const worldX = this.saloonCenter.worldX + radius * Math.cos(angle);
    const worldY = this.saloonCenter.worldY + radius * Math.sin(angle);

    positions.push({ worldX, worldY });
  }

  return positions;
}
```

### 3. Supply Drop Event

Modify `onEnterBetweenWaves()` in `GameScene.js`:

```javascript
onEnterBetweenWaves() {
  console.log('Entering BETWEEN_WAVES state');

  // Existing code for health pickups, cocktails, etc...

  // Trigger supply drop
  this.fortificationManager.triggerSupplyDrop(this.waveManager.currentWave);

  // Existing between-waves UI code...
}
```

**New method in `FortificationManager.js`:**

```javascript
triggerSupplyDrop(completedWaveNumber) {
  const nextWave = completedWaveNumber + 1;

  // Show notification
  this.scene.betweenWavesUI.showSupplyDropNotification();

  // Wait 0.5 seconds, then spawn props
  this.scene.time.delayedCall(500, () => {
    this.spawnPropsForWave(nextWave);
  });
}

spawnPropsForWave(waveNumber) {
  // Find which ring applies to this wave
  const ring = this.defensiveRings.find(r => r.waves.includes(waveNumber));

  if (!ring) return;

  // Calculate positions
  const positions = this.calculateRingPositions(ring);

  // Get prop types for this wave
  const propTypes = this.getItemsForWave(waveNumber);

  // Spawn props at each position
  positions.forEach((pos, index) => {
    const propType = propTypes[index % propTypes.length];

    // Check collision before spawning
    if (!this.isPositionOccupied(pos.worldX, pos.worldY)) {
      this.spawnFortificationProp(propType, pos.worldX, pos.worldY, false);
    }
  });
}
```

### 4. Supply Drop Notification UI

Add to `BetweenWavesUI.js`:

```javascript
showSupplyDropNotification() {
  const notificationText = this.scene.add.text(960, 150, 'Furniture delivered!', {
    fontSize: '48px',
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4,
    fontFamily: 'Arial'
  }).setOrigin(0.5);

  notificationText.setDepth(1000);

  // Fade out after 2 seconds
  this.scene.time.delayedCall(2000, () => {
    this.scene.tweens.add({
      targets: notificationText,
      alpha: 0,
      duration: 500,
      onComplete: () => notificationText.destroy()
    });
  });
}
```

## Prop Selection & Quantity

**Props Per Wave:**
- Waves 1-3 (Outer Ring): 8 props
- Waves 4-6 (Middle Ring): 10 props
- Waves 7-9 (Inner Ring): 12 props
- Waves 10-12 (Core Ring): 8 props

**Prop Type Selection:**
Use existing `getItemsForWave()` logic, cycling through prop types for each ring position.

**Prop Persistence:**
- Props from previous waves remain on battlefield
- Damaged props stay damaged between waves
- Destroyed props are permanently gone
- New waves add to existing fortifications

**Initial Furniture:**
Keep `spawnInitialFurniture()` unchanged - it places saloon furniture (bar, piano, tables, chairs, barrels, chandeliers) at fixed interior positions before wave 1.

## Edge Cases & Collision Handling

**Position Collision Checks:**

```javascript
isPositionOccupied(worldX, worldY, checkRadius = 1.5) {
  // Check existing props
  const hasPropNearby = this.fortificationProps.some(prop => {
    const dx = prop.worldX - worldX;
    const dy = prop.worldY - worldY;
    return Math.sqrt(dx * dx + dy * dy) < checkRadius;
  });

  // Check players
  const hasPlayerNearby = this.scene.playerManager.players.some(player => {
    const dx = player.worldX - worldX;
    const dy = player.worldY - worldY;
    return Math.sqrt(dx * dx + dy * dy) < 2.0;
  });

  // Check world bounds
  const margin = 1.0;
  const inBounds = worldX >= WORLD_MIN_X + margin &&
                   worldX <= WORLD_MAX_X - margin &&
                   worldY >= WORLD_MIN_Y + margin &&
                   worldY <= WORLD_MAX_Y - margin;

  return hasPropNearby || hasPlayerNearby || !inBounds;
}
```

**Handling Occupied Positions:**
If a calculated position is occupied, skip spawning at that spot. Accept some missing props rather than forcing placements or creating stacks.

## Game State Flow

1. Wave completes → `onWaveComplete()` called
2. Transition to `BETWEEN_WAVES` state
3. `onEnterBetweenWaves()` triggers supply drop
4. Notification appears: "Furniture delivered!"
5. After 0.5s delay, props spawn at ring positions
6. Player presses SPACE when ready → `WAVE_ACTIVE` state

Between-wave phase remains a breather period. Players press SPACE whenever ready - no forced timing.

## Files to Modify

1. **src/systems/FortificationManager.js**
   - Remove all drag-and-drop code
   - Add ring-based placement system
   - Add `triggerSupplyDrop()` and `spawnPropsForWave()` methods
   - Add `calculateRingPositions()` method
   - Add `isPositionOccupied()` collision check

2. **src/ui/BetweenWavesUI.js**
   - Add `showSupplyDropNotification()` method

3. **src/scenes/GameScene.js**
   - Update `onEnterBetweenWaves()` to call `triggerSupplyDrop()`
   - Remove any references to prop dragging

## Benefits

- **Removes distraction**: No more manual furniture placement interrupting flow
- **Maintains strategy**: Props still create meaningful defensive positions
- **Increases intensity**: Progressive ring tightening matches wave difficulty scaling
- **Faster pacing**: Between-wave phase is now purely a breather, not a puzzle
- **Simpler code**: Remove ~250 lines of drag-and-drop logic

## Testing Checklist

- [ ] Props spawn automatically at wave completion
- [ ] "Furniture delivered!" notification appears correctly
- [ ] Props form visible defensive rings around saloon center
- [ ] Ring radius decreases as waves progress (outer → middle → inner → core)
- [ ] Props don't spawn on top of players
- [ ] Props don't spawn on top of existing props
- [ ] Props remain within world bounds
- [ ] Initial furniture (bar, piano, etc.) still spawns before wave 1
- [ ] Props from previous waves persist correctly
- [ ] Damaged props stay damaged between waves
- [ ] Destroyed props don't respawn
- [ ] Collision and physics work correctly with new props
- [ ] SPACE key still starts next wave during between-waves phase