const Round = require('./Round');

class ListRound extends Round {
    // Handles an answer (string) submitted by a team.
    // Awards points per correct answer and locks out on wrong answer.
    handleAnswer(engine, teamIndex, answer) {
        const round = engine.state.rounds[engine.state.currentRoundIndex];
        const team = engine.state.teams[teamIndex];
        const points = this.data.points || 0;
        round.scores = round.scores || {};
        const currentQuestion = round.questions[engine.state.currentQuestionIndex];
        if (!round.foundAnswers) round.foundAnswers = [];
        // Check for explicit "Wrong" button (false) or incorrect string
        if (answer === false) {
            // Host pressed "Wrong" button - release buzzer and resume timer
            if (!engine.state.lockedOutTeams.includes(teamIndex)) {
                engine.state.lockedOutTeams.push(teamIndex);
            }
            engine.state.lastJudgement = false;

            engine.state.buzzerWinner = null;
            engine.state.buzzerLocked = false;
            // Resume the timer if there is time left
            if (engine.state.timerValue > 0) {
                engine.playSfx('wrong');
                engine.startTimer();
            } else {
                engine.state.status = 'TIMEOUT';
            }
            engine.save();
            return;
            return;
        }

        // If generic "Correct" (true) is sent, ignore it in List Round 
        // because we need a specific string answer to mark off.
        if (answer === true) {
            return;
        }

        const normalizedAnswer = answer.toString().trim().toLowerCase();
        const correctAnswers = (currentQuestion.answers || []).map(a => a.toString().trim().toLowerCase());

        // Find the case-preserved answer from the original list
        const originalAnswerIndex = correctAnswers.indexOf(normalizedAnswer);
        const originalAnswer = originalAnswerIndex !== -1 ? currentQuestion.answers[originalAnswerIndex] : null;

        if (originalAnswer && !round.foundAnswers.includes(originalAnswer)) {
            team.score += points;
            round.scores[teamIndex] = (round.scores[teamIndex] || 0) + points;
            round.foundAnswers.push(originalAnswer); // Store exact string for UI matching
            engine.state.lastJudgement = true;
            engine.playSfx('correct');

            // Keep game going. KEEP BUZZED for chaining answers.
            // Do NOT clear buzzerWinner.
            // Do NOT unlock buzzer.
            // Status remains BUZZED.
            engine.state.status = 'BUZZED';
        } else if (originalAnswer && round.foundAnswers.includes(originalAnswer)) {
            // Already found
            engine.state.lastJudgement = false; // Or null? Treat as repeat/wrong

            // Should we release buzzer here? Probably yes, or keep them to try another?
            // User: "until they get one wrong"
            // Repeating an answer is usually "wrong" or at least "stop".
            // Let's treat it as neutral or wrong. If neutral, keep buzzed?
            // Let's assume they made a mistake and lost their turn?
            // Actually, if they say "Apple" twice, it's just silly.
            // Let's keep them buzzed so they can correct themselves? 
            // OR treat as wrong. "until they get one wrong".
            // Implementation plan didn't specify.
            // Choice: Treat duplicate as Wrong (loss of turn).

            if (!engine.state.lockedOutTeams.includes(teamIndex)) {
                engine.state.lockedOutTeams.push(teamIndex);
            }
            engine.state.buzzerWinner = null;
            engine.state.buzzerLocked = false;
            if (engine.state.timerValue > 0) {
                engine.playSfx('wrong');
                engine.startTimer();
            } else {
                engine.state.status = 'TIMEOUT';
            }
        } else {
            // Wrong answer string – lock out the team
            if (!engine.state.lockedOutTeams.includes(teamIndex)) {
                engine.state.lockedOutTeams.push(teamIndex);
            }
            engine.state.lastJudgement = false;

            engine.state.buzzerWinner = null;
            engine.state.buzzerLocked = false;
            if (engine.state.timerValue > 0) {
                engine.playSfx('wrong');
                engine.startTimer();
            } else {
                engine.state.status = 'TIMEOUT';
            }
        }
        engine.save();
    }
}

module.exports = ListRound;
