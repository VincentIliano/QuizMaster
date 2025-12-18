
class Round {
    constructor(roundData) {
        this.data = roundData;
    }

    /**
     * Handle an answer judgment (Correct/Wrong)
     * @param {GameEngine} engine - The game engine instance
     * @param {number} teamIndex - The index of the buzzing team
     * @param {boolean} correct - Whether the answer was correct
     */
    handleAnswer(engine, teamIndex, correct) {
        throw new Error("Method 'handleAnswer' must be implemented.");
    }
}

module.exports = Round;
