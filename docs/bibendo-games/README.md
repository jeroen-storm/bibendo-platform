# Bibendo Game Structures

This folder contains flow chart documentation for the 3 Bibendo serious games used in the research platform.

## Games Overview

### 1. De analyse
- **Game ID**: `5986266371850240`
- **Total Items**: 64
- **Content Questions**: Items 1-61 (with correct/incorrect)
- **Reflection Questions**: Items 62-64 (no right/wrong, opinion-based)
- **Flow Chart**: Not available (tested game)

### 2. Sneakerstyle
- **Game ID**: `6394963623411712`
- **Total Items**: 53
- **Content Questions**: Items 1-50 (with correct/incorrect)
- **Reflection Questions**: Items 51-53 (no right/wrong, opinion-based)
- **Flow Chart**: `game2-sneakerstyle-flow.png`

### 3. De lancering
- **Game ID**: `5029286966722560`
- **Total Items**: 60
- **Content Questions**: Items 1-57 (with correct/incorrect)
- **Reflection Questions**: Items 58-60 (no right/wrong, opinion-based)
- **Flow Chart**: `game3-lancering-flow.png`

## Key Patterns

### Reflection Questions
All 3 games follow the same pattern:
- **Last 3 questions** are always reflection questions
- These are opinion-based, no correct/incorrect answers
- In database: `is_correct = NULL` for reflection questions

### Game Branching
- Content questions have correct/incorrect answers
- **Wrong answers** trigger alternative paths in the game
- This creates different routes through the game content
- Flow charts show these branching paths as multiple "lanes"

### Structure
Games are organized in horizontal "lanes" (3-4 levels):
- Each lane represents a learning path
- Students may switch lanes based on their answers
- Incorrect answers lead to remedial content in alternative paths
- All paths converge at the reflection questions at the end

## Production Deployment

### Scale
- **3 games** total
- **2-3 runs per game** (1 run = 1 school)
- **~20 students per run**
- **Total**: ~120-180 students

### Data Collection
Each student response includes:
- Question text
- Answer text
- Correctness (except for reflection questions)
- Points awarded
- Timestamp

This data is synced from Bibendo API and integrated into the platform timeline alongside reading platform events.
