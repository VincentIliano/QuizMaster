class CluesRound {
    constructor(roundData) {
        this.name = roundData.name;
        this.type = 'clues';
        this.questions = roundData.questions || [];
        this.initialPoints = roundData.initial_points || 15;
        this.reductionAmount = roundData.reduction_amount || 3;

        // Runtime state
        this.cluesRevealed = 0;
    }

    setupQuestion(gameEngine, questionIndex) {
        this.cluesRevealed = 0;
        gameEngine.state.cluesRevealed = 0;
        gameEngine.save();
    }

    revealClue(gameEngine) {
        const q = gameEngine.state.currentQuestionData;
        if (!q || !q.clues) return;

        if (this.cluesRevealed < q.clues.length) {
            this.cluesRevealed++;
            gameEngine.state.cluesRevealed = this.cluesRevealed; // Expose to state
            gameEngine.save();
            return true;
        }
        return false;
    }

    handleAnswer(gameEngine, teamIndex, correct) {
        if (correct) {
            // Calculate points
            // 1st clue (cluesRevealed=1): 15 points
            // 2nd clue (cluesRevealed=2): 15 - 3 = 12 points
            // Formula: initial - ((cluesRevealed - 1) * reduction)

            // Safety check: if 0 clues revealed, maybe it's full points? Or disallowed?
            // Let's assume max(1, cluesRevealed)
            const count = Math.max(1, this.cluesRevealed);

            const points = this.initialPoints - ((count - 1) * this.reductionAmount);

            // Ensure connection streak logic doesn't interfere (not relevant here but good practice)

            if (gameEngine.state.teams[teamIndex]) {
                gameEngine.addPoints(teamIndex, points, `Correct Answer (Clues: ${count} revealed)`);
            }

            gameEngine.revealAnswer(true);
        } else {
            // Wrong answer
            if (teamIndex !== -1) {
                if (!gameEngine.state.lockedOutTeams.includes(teamIndex)) {
                    gameEngine.state.lockedOutTeams.push(teamIndex);
                }
            }


            // Check if all teams are locked out
            if (gameEngine.state.lockedOutTeams.length >= gameEngine.state.teams.length) {
                gameEngine.state.status = "ALL_LOCKED";
                gameEngine.state.buzzerWinner = null;
                gameEngine.state.buzzerLocked = true;
                gameEngine.playSfx('wrong'); // Play sound for final lockout
                gameEngine.save();
            } else {
                gameEngine.state.buzzerWinner = null;
                gameEngine.state.buzzerLocked = false; // Re-open for others

                // No timer restart for Clues round (as per request to remove timer)
                gameEngine.state.status = "LISTENING";
                gameEngine.playSfx('wrong');
                gameEngine.save();
            }
        }
    }
}

module.exports = CluesRound;
