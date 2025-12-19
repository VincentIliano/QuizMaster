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
            // Return empty object on failure to allow server to start and overwrite corrupt file eventually
            return {};
        }
        return null;
    }

    saveGameState(state) {
        try {
            const tempPath = this.gameStatePath + '.tmp';
            fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
            fs.renameSync(tempPath, this.gameStatePath);
        } catch (e) {
            console.error("Error saving game state:", e);
        }
    }

    saveQuizData(data) {
        try {
            const tempPath = this.quizDataPath + '.tmp';
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
            fs.renameSync(tempPath, this.quizDataPath);
        } catch (e) {
            console.error("Error saving quiz data:", e);
        }
    }
}

module.exports = Storage;
