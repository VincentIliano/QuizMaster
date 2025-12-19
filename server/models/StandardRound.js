
const Round = require('./Round');

class StandardRound extends Round {

    nextQuestion(engine) {
        if (engine.state.status === 'ROUND_READY') {
            engine.state.status = "IDLE";
            engine.state.currentQuestionData = null;
            engine.state.currentQuestionIndex = (this.data.questionsAnswered || 0) - 1;
            engine.save();
            return;
        }

        // Increment index
        engine.state.currentQuestionIndex++;

        // Check if round is over
        if (engine.state.currentQuestionIndex >= this.data.questions.length) {
            this.data.questionsAnswered = this.data.questions.length;
            engine.state.status = "ROUND_SUMMARY";
            engine.save();
            return;
        }

        // Update progress
        this.data.questionsAnswered = engine.state.currentQuestionIndex;

        // Load Question Data
        engine.state.currentQuestionData = this.data.questions[engine.state.currentQuestionIndex];
        engine.state.timerValue = this.data.time_limit || 30;
        engine.state.buzzerLocked = false;
        engine.state.status = "READING"; // Standard starts in READING
        engine.state.mediaPlaying = false;

        engine.save();
    }

    handleAnswer(engine, teamIndex, correct) {
        const points = this.data.points || 0;
        const team = engine.state.teams[teamIndex];

        this.data.scores = this.data.scores || {};

        if (correct) {
            team.score += points;
            this.data.scores[teamIndex] = (this.data.scores[teamIndex] || 0) + points;

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
                // Pause and wait for host
                engine.state.status = "PAUSED";
                engine.state.lastJudgement = false;
                engine.save();
            }
        }
    }

    getPublicState(engine) {
        return {
            roundType: 'standard',
            maxTime: this.data.time_limit || 30,
        };
    }
}

module.exports = StandardRound;
