
const Round = require('./Round');

class ConnectionsRound extends Round {

    init(engine) {
        // Initialize grid if not present
        // This used to be in _initRoundStrategy
        // This is called when setRound() happens.

        // However, current GameEngine calls `init` on new instance creation
        // but `setRound` creates the instance.
        // We can just trust `setupQuestion` to handle lazy init if needed, or do it here.
    }

    nextQuestion(engine) {
        if (engine.state.status === 'ROUND_READY') {
            engine.state.status = "IDLE";
            engine.state.currentQuestionData = null;
            // Connections logic:
            // "For Connections, initialize timer immediately and fall through to load logic"
            // The original code fell through if type === connections
            engine.state.currentQuestionIndex = this.data.questionsAnswered || 0;
            // No return, fall through to loading logic below
        } else {
             // Normal increment
            engine.state.currentQuestionIndex++;
            if (engine.state.currentQuestionIndex >= (this.data.questions ? this.data.questions.length : (this.data.groups ? 1 : 0))) {
                this.data.questionsAnswered = engine.state.currentQuestionIndex; // or max
                engine.state.status = "ROUND_SUMMARY";
                engine.save();
                return;
            }
             this.data.questionsAnswered = engine.state.currentQuestionIndex;
        }

        // Load Data
        // Handle legacy "single question" vs "multiple questions"
        // If `this.data.groups` exists at top level, it's a single question round wrapped.
        // But `GameEngine.js` suggests `r.questions`.
        // Let's assume standardized `questions` array.

        engine.state.currentQuestionData = this.data.questions[engine.state.currentQuestionIndex];

        // Setup Grid
        this.setupQuestion(engine, engine.state.currentQuestionIndex);

        engine.state.timerValue = this.data.time_limit || 60;
        engine.state.buzzerLocked = false;

        // Auto-start timer
        engine.startTimer();
        engine.state.status = "LISTENING";
        // engine.save() is called by startTimer
    }

    setupQuestion(engine, questionIndex) {
        const question = this.data.questions[questionIndex];
        if (!question.gridItems) {
            // Flatten groups into grid items
            let items = [];
            question.groups.forEach((group, gIdx) => {
                group.items.forEach(item => {
                    items.push({
                        text: item,
                        groupIndex: gIdx,
                        id: Math.random().toString(36).substr(2, 9),
                        solved: false,
                        selected: false
                    });
                });
            });
            // Shuffle
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
            question.gridItems = items;
            question.solvedGroups = [];
        }
    }

    handleAnswer(engine, teamIndex, correct) {
        // Connections usually doesn't have a simple "Correct/Wrong" via Host
        // It has interactive grid clicking.
        // But if Host presses Correct/Wrong manually?
        // Let's implement generic score add if needed.
        if (correct) {
             const points = this.data.points || 1;
             const team = engine.state.teams[teamIndex];
             this.data.scores = this.data.scores || {};
             team.score += points;
             this.data.scores[teamIndex] = (this.data.scores[teamIndex] || 0) + points;
             engine.save();
        }
    }

    revealGroup(engine, groupIndex) {
        const question = this.data.questions[engine.state.currentQuestionIndex];
        if (!question || !question.gridItems) return;

        // Mark items as solved
        question.gridItems.forEach(item => {
            if (item.groupIndex === groupIndex) {
                item.solved = true;
                item.selected = false;
            }
        });

        // Add to solved list
        if (!question.solvedGroups) question.solvedGroups = [];
        if (!question.solvedGroups.includes(groupIndex)) {
            question.solvedGroups.push(groupIndex);
        }

        // Check if all solved
        if (question.solvedGroups.length === question.groups.length) {
            // Maybe auto-award points?
            // Current logic implies manual scoring or bespoke logic.
            // Let's stick to state update.
        }

        // Reset selections
        question.gridItems.forEach(i => i.selected = false);

        engine.state.connectionStreak = 0; // Reset streak?
        engine.save();
    }

    getPublicState(engine) {
        const q = engine.state.currentQuestionData;
        return {
            roundType: 'connections',
            gridItems: q ? q.gridItems : [],
            solvedGroups: q ? q.solvedGroups : [],
            groups: q ? q.groups : [],
            maxTime: this.data.time_limit || 60,
        };
    }

    reset(engine) {
        super.reset(engine);
        // Clear grid state
        if (this.data.questions) {
            this.data.questions.forEach(q => {
                q.gridItems = null;
                q.solvedGroups = [];
            });
        }
    }
}

module.exports = ConnectionsRound;
