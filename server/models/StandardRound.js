
const Round = require('./Round');

class StandardRound extends Round {
    handleAnswer(engine, teamIndex, correct) {
        const points = this.data.points || 0;
        const team = engine.state.teams[teamIndex];
        const round = engine.state.rounds[engine.state.currentRoundIndex];

        round.scores = round.scores || {};

        if (correct) {
            team.score += points;
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
                engine.state.buzzerLocked = true; // Lock buzzers while paused
                // Don't auto-start timer here? Maybe wait for host to resume?
                // The prompt says "this way the other players have the chance to answer".
                // Usually host resumes timer manually or it auto-resumes. 
                // Let's set status to PAUSED so host can resume, OR back to LISTENING if we want to force flow.
                // Given existing mechanics, setting to PAUSED is safer as it stops the timer until host is ready.
                // BUT user wants "chance to answer". If we go to PAUSED, host hits resume. 
                // Let's go to PAUSED.
                engine.state.status = "PAUSED";
                engine.state.lastJudgement = false; // Trigger flash on client
                engine.save();
            }
        }
    }
}

module.exports = StandardRound;
