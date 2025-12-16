const fs = require('fs');
const path = require('path');

class Storage {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.quizDataPath = path.join(dataDir, 'quiz_data.json');
        this.gameStatePath = path.join(dataDir, 'game_state.json');
    }

    loadQuizData() {
        try {
            if (fs.existsSync(this.quizDataPath)) {
                const raw = fs.readFileSync(this.quizDataPath);
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error("Error loading quiz data:", e);
        }
        return { rounds: [] };
    }

    loadGameState() {
        try {
            if (fs.existsSync(this.gameStatePath)) {
                const raw = fs.readFileSync(this.gameStatePath);
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error("Error loading game state:", e);
        }
        return null;
    }

    saveGameState(state) {
        try {
            fs.writeFileSync(this.gameStatePath, JSON.stringify(state, null, 2));
        } catch (e) {
            console.error("Error saving game state:", e);
        }
    }
}

module.exports = Storage;
