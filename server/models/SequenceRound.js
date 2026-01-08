
const Round = require('./Round');

class SequenceRound extends Round {
    setupQuestion(engine, questionIndex) {
        // Reset sequence state
        engine.state.sequenceOptionIndex = -1;
        engine.state.sequenceVotes = {};
        engine.state.status = "READING"; // Ensure consistent start state
        engine.save();
    }

    handleBuzz(engine, teamIndex) {
        // Only allow voting if sequence is active (index >= 0) and not already voted
        const currentIndex = engine.state.sequenceOptionIndex;

        // Block if sequence hasn't started or user already voted
        if (currentIndex < 0) return null;
        if (engine.state.sequenceVotes[teamIndex] !== undefined) return null;

        // Record vote
        engine.state.sequenceVotes[teamIndex] = currentIndex;

        // Play sound - lightweight beep/click for feedback?
        engine.playSfx('buzz');

        // Check completion
        const totalTeams = engine.state.teams.length;
        const votedCount = Object.keys(engine.state.sequenceVotes).length;

        if (votedCount >= totalTeams) {
            engine.state.status = "SEQUENCE_COMPLETE";
        }

        engine.save();
        return true;
    }

    nextOption(engine) {
        if (!engine.state.currentQuestionData) return;
        const options = engine.state.currentQuestionData.options || [];

        if (engine.state.sequenceOptionIndex < options.length - 1) {
            engine.state.sequenceOptionIndex++;
            engine.state.status = "SEQUENCE_RUNNING";
            engine.save();
        } else {
            engine.state.status = "SEQUENCE_COMPLETE";
            engine.save();
        }
    }

    onReveal(engine) {
        const correctIndex = engine.state.currentQuestionData.answer;
        const points = this.data.points || 10;
        let anyCorrect = false;

        Object.entries(engine.state.sequenceVotes).forEach(([teamIndex, voteIndex]) => {
            // Loose equality for string/number safety
            if (voteIndex == correctIndex) {
                const tid = parseInt(teamIndex);
                if (engine.state.teams[tid]) {
                    engine.addPoints(tid, points, 'Correct Answer (Sequence)');

                    // Update round scores for summary
                    const round = engine.state.rounds[engine.state.currentRoundIndex];
                    round.scores = round.scores || {};
                    round.scores[tid] = (round.scores[tid] || 0) + points;
                    anyCorrect = true;
                }
            }
        });

        engine.state.lastJudgement = anyCorrect;
    }

    // Required by abstract class but not used
    handleAnswer(engine, teamIndex, correct) { }
}

module.exports = SequenceRound;
