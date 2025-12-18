
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
        } else {
            team.score -= points;
            round.scores[teamIndex] = (round.scores[teamIndex] || 0) - points;
        }

        engine.state.lastJudgement = correct;
        engine.state.status = "ANSWER_REVEALED";
        engine.save();
    }
}

module.exports = StandardRound;
