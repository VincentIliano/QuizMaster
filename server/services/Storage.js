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
            console.log("Loading quiz data from:", this.quizDataPath);
            if (fs.existsSync(this.quizDataPath)) {
                const raw = fs.readFileSync(this.quizDataPath);
                const data = JSON.parse(raw);
                console.log("Quiz data loaded, rounds:", data.rounds ? data.rounds.length : 0);
                return data;
            } else {
                console.warn("Quiz data file not found at:", this.quizDataPath);
            }
        } catch (e) {
            console.error("Error loading quiz data:", e);
        }
        return { rounds: [] };
    }

    loadGameState() {
        try {
            if (fs.existsSync(this.gameStatePath)) {
                const raw = fs.readFileSync(this.gameStatePath, 'utf8');
                if (!raw || raw.trim().length === 0) {
                    return {};
                }
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
            this._safeRename(tempPath, this.gameStatePath);
        } catch (e) {
            console.error("Error saving game state:", e);
        }
    }

    saveQuizData(data) {
        try {
            const tempPath = this.quizDataPath + '.tmp';
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
            this._safeRename(tempPath, this.quizDataPath);
        } catch (e) {
            console.error("Error saving quiz data:", e);
        }
    }

    _safeRename(oldPath, newPath, retries = 5, delay = 50) {
        try {
            // Check if target exists and try to delete it first if rename fails? 
            // Standard rename overwrites, but EPERM can happen.
            // Just try rename.
            if (fs.existsSync(newPath)) {
                try {
                    // Sometimes deleting target first helps on Windows if rename fails, 
                    // but usually rename is atomic. 
                    // Let's stick to simple retry first.
                } catch (e) { }
            }
            fs.renameSync(oldPath, newPath);
        } catch (e) {
            if (retries > 0 && (e.code === 'EPERM' || e.code === 'EBUSY')) {
                // Busy wait for synchronous delay
                const start = Date.now();
                while (Date.now() - start < delay) { }
                this._safeRename(oldPath, newPath, retries - 1, delay * 2);
            } else {
                throw e;
            }
        }
    }
}

module.exports = Storage;
