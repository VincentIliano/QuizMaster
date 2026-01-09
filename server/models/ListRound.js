const Round = require('./Round');

class ListRound extends Round {

    // New: Handle BuzzQueue
    handleBuzz(engine, teamIndex) {
        if (engine.state.status === 'LISTENING') {
            const queue = engine.state.buzzerQueue || [];

            // Prevent duplicates
            if (queue.includes(teamIndex)) {
                return engine.state.teams[teamIndex].name; // Return name to halt GameEngine processing, but do nothing
            }

            if (!engine.state.lockedOutTeams.includes(teamIndex)) {
                queue.push(teamIndex);
                engine.state.buzzerQueue = queue;
                engine.playSfx('buzz');
                engine.save();
                return engine.state.teams[teamIndex].name;
            }
        }
        return false; // Not handled, or ignored
    }

    startAnsweringPhase(engine) {
        if (engine.state.buzzerQueue && engine.state.buzzerQueue.length > 0) {
            engine.state.status = 'ANSWERING';
            engine.state.listRoundActiveIndex = 0;

            // Set first player as "Winner" so UI shows them as active
            const firstTeam = engine.state.buzzerQueue[0];
            engine.state.buzzerWinner = firstTeam;

            engine.save();
        }
    }

    nextTurn(engine) {
        const queue = engine.state.buzzerQueue || [];
        if (queue.length === 0) return;

        let currentIndex = engine.state.listRoundActiveIndex;
        let foundNext = false;

        // Try to find next available player in the queue (circular)
        // Check up to queue.length times to avoid infinite loop
        for (let i = 1; i <= queue.length; i++) {
            const nextIdx = (currentIndex + i) % queue.length;
            const teamIndex = queue[nextIdx];

            if (!engine.state.lockedOutTeams.includes(teamIndex)) {
                engine.state.listRoundActiveIndex = nextIdx;
                engine.state.buzzerWinner = teamIndex;
                foundNext = true;
                break;
            }
        }

        if (!foundNext) {
            // All players locked out
            engine.state.status = 'TIMEOUT'; // Or appropriate end state
            engine.state.buzzerWinner = null;
        }

        engine.save();
    }

    handleAnswer(engine, teamIndex, answer) {
        const round = engine.state.rounds[engine.state.currentRoundIndex];
        const points = this.data.points || 0;
        round.scores = round.scores || {};
        const currentQuestion = round.questions[engine.state.currentQuestionIndex];
        if (!round.foundAnswers) round.foundAnswers = [];

        // WRONG / PASS (Host clicked "Wrong")
        if (answer === false) {
            if (!engine.state.lockedOutTeams.includes(teamIndex)) {
                engine.state.lockedOutTeams.push(teamIndex);
                engine.playSfx('wrong');
            }
            this.nextTurn(engine);
            return;
        }

        // CORRECT (Host clicked "Correct" or specific answer - though for List Round generic Correct is useful)
        // If Host clicks "Correct" button (answer === true)
        if (answer === true) {
            // In new flow, Host tracks answer manually or just awards points?
            // User said: "if it's a correct word, the host reveals it, then the next player automatically goes active"
            // How does host reveal? By clicking the word on the board?
            // If Host clicks word on board, `handleAnswer` is called with string?
            // If Host clicks "Correct" button, what happens? 

            // Assuming Host clicks the word on the dashboard.
            // But existing host panel has "Correct" button. 
            // Let's assume generic "Correct" awards points but DOES NOT reveal specific word (host must do that?).
            // Actually, `ListRound` logic usually requires specific word matching.
            // But if we are in this "Turn" mode, maybe standard "Correct" just awards points?
            // But which word?
            // Let's look at `ListRound` legacy logic. It matched strings.
            // HostControlPanel for List Round has clickable answers. `judge(answerString)`.
            // HostControlPanel also has generic "Correct" button `judge(true)`.

            // Let's support Generic Correct (button) -> Just award points, move turn. 
            // (Assuming host manages revealing manually or doesn't care).
            engine.addPoints(teamIndex, points, 'Correct Answer (List)');
            round.scores[teamIndex] = (round.scores[teamIndex] || 0) + points;
            engine.playSfx('correct');
            this.nextTurn(engine);
            return;
        }

        // Specific String Answer (Host clicked a word on dashboard)
        const normalizedAnswer = answer.toString().trim().toLowerCase();
        const correctAnswers = (currentQuestion.answers || []).map(a => a.toString().trim().toLowerCase());
        const originalAnswerIndex = correctAnswers.indexOf(normalizedAnswer);
        const originalAnswer = originalAnswerIndex !== -1 ? currentQuestion.answers[originalAnswerIndex] : null;

        if (originalAnswer && !round.foundAnswers.includes(originalAnswer)) {
            engine.addPoints(teamIndex, points, 'Correct Answer (List)');
            round.scores[teamIndex] = (round.scores[teamIndex] || 0) + points;
            round.foundAnswers.push(originalAnswer);
            engine.playSfx('correct');
            this.nextTurn(engine); // Move turn after correct answer too
        } else {
            // Already found or invalid?
            // If host clicks an updated word, maybe do nothing?
            // Or treat as "Wrong"?
            // Logic says: "If a player says a wrong answer... frozen".
            // If host clicks a word on the list, it's inherently "Correct". 
            // So this branch is only if something weird happens.
            // Let's assume generic click on list = Correct.
        }
    }
}

module.exports = ListRound;
