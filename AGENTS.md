# AI Agent Instructions for Quiz Master Project

This repository follows a strict architecture for maintainability and extensibility. When modifying or extending this codebase, please adhere to the following guidelines.

## Architecture Overview

The backend uses a `GameEngine` that delegates round-specific logic to `Round` subclasses. The frontend uses a `RoundRenderer` to display the appropriate component based on the round type.

### Backend (`server/`)

*   **`GameEngine.js`**: The central controller. It manages global state (teams, current round index) but delegates specific game mechanics to the current `Round` instance.
*   **`models/Round.js`**: The base class (interface) for all round types. All rounds must extend this.
*   **`models/`**: Contains specific implementations like `StandardRound.js`, `FreezeOutRound.js`, `ConnectionsRound.js`.
*   **`services/RoundFactory.js`**: Instantiates the correct `Round` subclass based on the string type found in `quiz_data.json`.

### Frontend (`client/`)

*   **`Contestant.jsx`**: The main view for players. It uses `RoundRenderer` to show the game interface.
*   **`components/RoundRenderer.jsx`**: A switch that renders the specific component for the current round type.
*   **`components/rounds/`**: Contains the React components for each round type (e.g., `StandardRound.jsx`, `FreezeOutRound.jsx`).

## How to Add a New Round Type

To add a new round type (e.g., "FastMoney"):

1.  **Backend Implementation**:
    *   Create `server/models/FastMoneyRound.js` extending `Round`.
    *   Implement `nextQuestion`, `handleAnswer`, `getPublicState` (to expose custom data), `tick` (if custom timer logic needed), and `reset`.
    *   Register the new class in `server/services/RoundFactory.js`.

2.  **Frontend Implementation**:
    *   Create `client/src/components/rounds/FastMoneyRound.jsx`. This component receives `state` and `animClass`.
    *   Update `client/src/components/RoundRenderer.jsx` to import the new component and add a case to the switch statement matching the round type string.

3.  **Data**:
    *   Ensure the `quiz_data.json` (or the editor) supports the new type string (e.g., `"type": "fastmoney"`).

## Coding Standards

*   **Separation of Concerns**: `GameEngine` should not know about specific round mechanics. If you find yourself writing `if (round.type === '...')` in `GameEngine`, you are doing it wrong. Move that logic to the `Round` class.
*   **State Management**: All state changes should be finalized with `engine.save()` to persist and broadcast to clients.
*   **Testing**: When adding a new round, add a test case in `server/tests/GameEngine.test.js` to verify its flow.

## Common Tasks

*   **Modifying Scoring**: Update `handleAnswer` in the specific `Round` subclass.
*   **Changing Timer Behavior**: Override `tick` in the `Round` subclass.
*   **Adding New Visuals**: Update the specific round component in `client/src/components/rounds/`.
