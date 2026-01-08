
const Round = require('./Round');

class StandardRound extends Round {
    handleAnswer(engine, teamIndex, correct) {
        const points = this.data.points || 0;
        const team = engine.state.teams[teamIndex];
        const round = engine.state.rounds[engine.state.currentRoundIndex];

        round.scores = round.scores || {};

        if (correct) {
            engine.addPoints(teamIndex, points, 'Correct Answer');
            round.scores[teamIndex] = (round.scores[teamIndex] || 0) + points;

            engine.state.lastJudgement = correct;
            engine.state.status = "ANSWER_REVEALED";
            engine.save();
        } else {
            // Wrong answer: Lock out the team
            if (!engine.state.lockedOutTeams.includes(teamIndex)) {
                engine.state.lockedOutTeams.push(teamIndex);
            }

            // Check if all teams are locked out
            if (engine.state.lockedOutTeams.length >= engine.state.teams.length) {
                engine.state.status = "ALL_LOCKED";
                engine.state.buzzerWinner = null;
                engine.state.buzzerLocked = true;
                engine.save();
            } else {
                // Return to listening state for other players
                engine.state.buzzerWinner = null;
                engine.state.buzzerLocked = false;
                engine.state.lastJudgement = false; // Trigger flash on client

                // Auto-resume timer
                if (engine.state.timerValue > 0) {
                    engine.playSfx('wrong'); // Explicitly play wrong sound as we are bypassing the PAUSED state
                    engine.startTimer();
                } else {
                    engine.state.status = "TIMEOUT";
                    engine.state.buzzerLocked = true;
                }

                engine.save();
            }
        }
    }
}

module.exports = StandardRound;
