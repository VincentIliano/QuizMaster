
const Round = require('./Round');

class FreezeOutRound extends Round {
    handleAnswer(engine, teamIndex, correct) {
        const team = engine.state.teams[teamIndex];
        const round = engine.state.rounds[engine.state.currentRoundIndex];

        if (correct) {
            // Score = timerValue
            const points = engine.state.timerValue;
            round.scores = round.scores || {};

            team.score += points;
            round.scores[team.name] = (round.scores[team.name] || 0) + points;

            engine.state.lastJudgement = correct;
            engine.state.status = "ANSWER_REVEALED";
            engine.save();
        } else {
            // WRONG ANSWER in FreezeOut
            // No penalty (0 points), but lockout.
            // Do NOT reveal answer. Resume timer UNLESS all locked out.

            engine.state.lockedOutTeams.push(teamIndex);
            engine.state.buzzerWinner = null;
            engine.state.buzzerLocked = false;

            // Check if ALL teams are locked out
            const allLocked = engine.state.teams.every((_, i) => engine.state.lockedOutTeams.includes(i));

            if (allLocked) {
                engine.state.status = "ALL_LOCKED";
                engine.state.buzzerLocked = true;
                engine.state.mediaPlaying = false;
            } else {
                // Resume timer
                engine.startTimer();
            }

            engine.save();
        }
    }
}

module.exports = FreezeOutRound;
