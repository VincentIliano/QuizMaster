
const Round = require('./Round');

class FreezeOutRound extends Round {
    setupQuestion(engine, questionIndex) {
        const round = engine.state.rounds[engine.state.currentRoundIndex];
        const question = round.questions[questionIndex];

        // 1. Determine Max Time
        // Prefer question-specific time_limit, fallback to round time_limit, default 20
        this.maxTime = question.time_limit || round.time_limit || 20;
        engine.state.timerValue = this.maxTime;

        // 2. Determine Max Points
        // Standard round points?
        this.maxPoints = round.points || 20;
    }

    handleAnswer(engine, teamIndex, correct) {
        const team = engine.state.teams[teamIndex];
        const round = engine.state.rounds[engine.state.currentRoundIndex];

        // Calculate Points: Linear from MaxPoints down to 5
        // Formula: 5 + Math.floor( (Timer / MaxTime) * (MaxPoints - 5) )
        let points = 5;
        if (this.maxTime > 0) {
            const ratio = engine.state.timerValue / this.maxTime;
            points = 5 + Math.floor(ratio * (this.maxPoints - 5));
        }

        if (correct) {
            round.scores = round.scores || {};
            team.score += points;
            round.scores[teamIndex] = (round.scores[teamIndex] || 0) + points;

            engine.state.lastJudgement = correct;
            engine.state.status = "ANSWER_REVEALED";
            engine.save();
        } else {
            // WRONG ANSWER
            // Lock out, but continue
            engine.state.lockedOutTeams.push(teamIndex);

            // If all locked, stop?
            // "when the time runs out... players don't lose... media keeps playing"
            // But if EVERYONE got it wrong? Usually that means stop.
            // Let's keep standard lockout behavior: if all locked, stop.
            const allLocked = engine.state.teams.every((_, i) => engine.state.lockedOutTeams.includes(i));

            if (allLocked) {
                engine.state.status = "ALL_LOCKED";
                engine.state.buzzerLocked = true;
                engine.state.mediaPlaying = false;
            } else {
                // Resume timer
                // Ensure buzzer is unlocked for others
                engine.state.buzzerWinner = null;
                engine.state.buzzerLocked = false;
                engine.startTimer();
            }
            engine.save();
        }
    }

    handleTimeout(engine) {
        // "when the time runs out, the players don't lose. the media just keeps playing"
        // Stop the actual timer interval so it stays at 0
        engine.stopTimer();

        // Ensure state allows buzzing
        // Keep status as LISTENING (or whatever allows buzzing)
        engine.state.status = "LISTENING";
        engine.state.buzzerLocked = false;

        // Media should keep playing (engine.state.mediaPlaying is likely true from before)
        engine.state.mediaPlaying = true;

        engine.save();
    }
}

module.exports = FreezeOutRound;
