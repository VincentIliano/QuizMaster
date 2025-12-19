
class Round {
    constructor(roundData) {
        this.data = roundData;
    }

    init(engine) {
        // Optional initialization logic
    }

    nextQuestion(engine) {
        // Logic to determine next question state
        throw new Error("Method 'nextQuestion' must be implemented.");
    }

    handleAnswer(engine, teamIndex, correct) {
        throw new Error("Method 'handleAnswer' must be implemented.");
    }

    getPublicState(engine) {
        // Return object with round-specific state
        return {};
    }

    tick(engine) {
        // Handle timer tick
        engine.state.timerValue--;
        if (engine.state.timerValue <= 0) {
            engine.stopTimer();
            engine.state.buzzerLocked = true;
            engine.state.status = "TIMEOUT";
            engine.state.mediaPlaying = false;
            engine.save();
        }
    }

    reset(engine) {
        // Default reset logic (can be overridden)
        this.data.questionsAnswered = 0;
        this.data.scores = {};
    }
}

module.exports = Round;
