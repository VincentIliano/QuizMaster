
const Round = require('./Round');

class FreezeOutRound extends Round {

    nextQuestion(engine) {
        // Behaves like Standard Round regarding progression
        // Can inherit or copy logic. Since inheritance is single, and we extend Round, let's copy common logic or create a shared helper.
        // For simplicity and decoupling, I'll copy the progression logic but modify defaults.

        if (engine.state.status === 'ROUND_READY') {
            engine.state.status = "IDLE";
            engine.state.currentQuestionData = null;
            engine.state.currentQuestionIndex = (this.data.questionsAnswered || 0) - 1;
            engine.save();
            return;
        }

        engine.state.currentQuestionIndex++;

        if (engine.state.currentQuestionIndex >= this.data.questions.length) {
            this.data.questionsAnswered = this.data.questions.length;
            engine.state.status = "ROUND_SUMMARY";
            engine.save();
            return;
        }

        this.data.questionsAnswered = engine.state.currentQuestionIndex;

        engine.state.currentQuestionData = this.data.questions[engine.state.currentQuestionIndex];
        engine.state.timerValue = this.data.time_limit || 30; // Usually longer for freezeout
        engine.state.buzzerLocked = false;
        engine.state.status = "READING";
        engine.state.mediaPlaying = false;

        engine.save();
    }

    handleAnswer(engine, teamIndex, correct) {
        const team = engine.state.teams[teamIndex];

        if (correct) {
            // Score = timerValue
            const points = engine.state.timerValue;
            this.data.scores = this.data.scores || {};

            team.score += points;
            this.data.scores[teamIndex] = (this.data.scores[teamIndex] || 0) + points;

            engine.state.lastJudgement = correct;
            engine.state.status = "ANSWER_REVEALED";
            engine.save();
        } else {
            // WRONG ANSWER: Lockout but resume timer if anyone left
            engine.state.lockedOutTeams.push(teamIndex);
            engine.state.buzzerWinner = null;
            engine.state.buzzerLocked = false;

            const allLocked = engine.state.teams.every((_, i) => engine.state.lockedOutTeams.includes(i));

            if (allLocked) {
                engine.state.status = "ALL_LOCKED";
                engine.state.buzzerLocked = true;
                engine.state.mediaPlaying = false;
            } else {
                // Resume timer automatically
                engine.startTimer();
                // We do NOT save status as PAUSED, we go back to LISTENING via startTimer
            }
            // Note: startTimer calls save()
        }
    }

    getPublicState(engine) {
        return {
            roundType: 'freezeout',
            maxTime: this.data.time_limit || 30,
        };
    }
}

module.exports = FreezeOutRound;
