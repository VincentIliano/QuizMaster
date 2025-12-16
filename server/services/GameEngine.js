class GameEngine {
    constructor(storage) {
        this.storage = storage;
        this.timerInterval = null;

        // Initial State
        this.state = {
            teams: [],
            rounds: [],
            currentRoundIndex: -1,
            currentQuestionIndex: -1,
            currentQuestionData: null,
            timerValue: 0,
            buzzerLocked: true,
            buzzerWinner: null, // Index
            status: "DASHBOARD",
            roundsSummary: []
        };

        this.init();
    }

    init() {
        const quizData = this.storage.loadQuizData();
        this.state.rounds = quizData.rounds || [];

        // Ensure rounds initialized
        this.state.rounds.forEach(r => {
            r.scores = r.scores || {};
            r.questionsAnswered = r.questionsAnswered || 0;
        });

        const savedState = this.storage.loadGameState();
        if (savedState) {
            Object.assign(this.state, savedState);
            // Re-init safety
            if (this.state.rounds) {
                this.state.rounds.forEach(r => {
                    r.scores = r.scores || {};
                    r.questionsAnswered = r.questionsAnswered || 0;
                });
            }
            this.state.status = "DASHBOARD"; // Force dashboard on load
        }

        this.updateSummary();
    }

    save() {
        this.updateSummary();
        this.storage.saveGameState(this.state);
        if (this.onStateChange) this.onStateChange(this.getPublicState());
    }

    updateSummary() {
        this.state.roundsSummary = this.state.rounds.map((r, i) => ({
            index: i,
            name: r.name,
            points: r.points,
            questionsAnswered: r.questionsAnswered,
            totalQuestions: r.questions ? r.questions.length : 0,
            scores: r.scores
        }));
    }

    getPublicState() {
        const s = this.state;

        let upcomingQ = null;
        if (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) {
            const r = s.rounds[s.currentRoundIndex];
            if (r.questions && r.questionsAnswered < r.questions.length) {
                upcomingQ = r.questions[r.questionsAnswered];
            }
        }

        return {
            roundIndex: s.currentRoundIndex,
            questionIndex: s.currentQuestionIndex,
            question: s.currentQuestionData ? s.currentQuestionData.text : "",
            roundName: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].name : "",
            roundDescription: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].description : "",
            roundPoints: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].points : 0,
            timeLimit: s.timerValue,
            status: s.status,
            teams: s.teams,
            buzzerWinner: s.buzzerWinner,
            currentAnswer: (s.currentQuestionData && (s.status === 'ANSWER_REVEALED' || s.status === 'GAME_OVER')) ? s.currentQuestionData.answer : null,
            answer: s.currentQuestionData ? s.currentQuestionData.answer : null,
            roundsSummary: s.roundsSummary,
            upcomingQuestion: upcomingQ ? upcomingQ.text : null,
            upcomingAnswer: upcomingQ ? upcomingQ.answer : null
        };
    }

    // --- Actions ---

    setTeams(teamNames) {
        this.state.teams = teamNames.map(name => ({ name, score: 0 }));
        this.state.currentRoundIndex = -1;
        this.state.currentQuestionIndex = -1;
        this.state.status = "DASHBOARD";
        this.save();
    }

    setRound(roundIndex) {
        if (roundIndex >= 0 && roundIndex < this.state.rounds.length) {
            this.state.currentRoundIndex = roundIndex;
            const r = this.state.rounds[roundIndex];

            // If checking resume, maybe check if finished? 
            // Simplified: Always go to READY first, then nextQuestion figures out index.
            // But if resuming mid-round, we might want to skip ready? 
            // Requirement says "everytime you enter a round".

            this.state.currentQuestionIndex = (r.questionsAnswered || 0) - 1;
            // logic in nextQuestion handles increment. 
            // To start at the right place, we stay at "answered - 1" so nextQuestion moves to "answered".

            this.state.status = "ROUND_READY";
            this.save();
        }
    }

    nextQuestion(autoStart = false, onTick = null) {
        this.stopTimer();
        this.state.buzzerWinner = null;
        this.state.buzzerLocked = true;

        // Logic split:
        if (this.state.status === 'ROUND_READY') {
            // Transition to IDLE state (Round Active, no question yet)
            this.state.status = "IDLE";
            this.state.currentQuestionData = null;

            // Ensure index is set correctly so next "nextQuestion" call increments to the correct question
            // We want currentQuestionIndex to be (questionsAnswered - 1)
            const currentRound = this.state.rounds[this.state.currentRoundIndex];
            this.state.currentQuestionIndex = (currentRound.questionsAnswered || 0) - 1;

            this.save();
            return;
        } else {
            // Normal progression
            if (this.state.currentRoundIndex === -1) {
                this.state.currentRoundIndex = 0;
                this.state.currentQuestionIndex = 0;
            } else {
                this.state.currentQuestionIndex++;
                const currentRound = this.state.rounds[this.state.currentRoundIndex];

                if (this.state.currentQuestionIndex >= currentRound.questions.length) {
                    // Round Finished
                    currentRound.questionsAnswered = currentRound.questions.length;
                    this.state.currentRoundIndex++; // Auto advance round? Or back to dashboard?
                    // Let's go back to dashboard to select next round manually
                    this.state.currentRoundIndex = -1;
                    this.state.status = "DASHBOARD";
                    this.save();
                    return;
                } else {
                    currentRound.questionsAnswered = this.state.currentQuestionIndex;
                }
            }
        }

        if (this.state.currentRoundIndex >= this.state.rounds.length || this.state.currentRoundIndex === -1) {
            this.state.status = "DASHBOARD";
            this.state.currentQuestionData = null;
            this.save();
            return;
        }

        const currentRound = this.state.rounds[this.state.currentRoundIndex];
        this.state.currentQuestionData = currentRound.questions[this.state.currentQuestionIndex];
        this.state.timerValue = currentRound.time_limit || 30;
        this.state.status = "READING";
        this.save();

        // Auto-Start Timer if requested
        if (autoStart) {
            this.startTimer(onTick);
        }
    }

    previousQuestion() {
        if (this.state.currentRoundIndex === -1) return;

        this.stopTimer();
        this.state.buzzerWinner = null;
        this.state.buzzerLocked = true;

        this.state.currentQuestionIndex--;

        if (this.state.currentQuestionIndex < 0) {
            // Go back to Ready
            this.state.status = "ROUND_READY";
            this.state.currentQuestionData = null;
        } else {
            // Show previous question
            const currentRound = this.state.rounds[this.state.currentRoundIndex];
            this.state.currentQuestionData = currentRound.questions[this.state.currentQuestionIndex];
            this.state.timerValue = currentRound.time_limit || 30;
            this.state.status = "READING";
            // We don't update questionsAnswered or scores when going back, usually. 
            // Just navigation.
        }
        this.save();
    }

    startTimer(onTick) {
        if (this.state.timerValue > 0 && this.state.buzzerWinner === null && this.state.status !== 'TIMEOUT') {
            this.state.buzzerLocked = false;
            this.state.status = "LISTENING";
            this.save();

            this.stopTimer();
            this.timerInterval = setInterval(() => {
                this.state.timerValue--;
                if (onTick) onTick(this.state.timerValue);

                if (this.state.timerValue <= 0) {
                    this.stopTimer();
                    this.state.buzzerLocked = true;
                    this.state.status = "TIMEOUT";
                    this.save();
                }
            }, 1000);
        }
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    handleBuzz(teamIndex) {
        if (this.state.buzzerLocked) return null;
        if (teamIndex >= 0 && teamIndex < this.state.teams.length) {
            this.state.buzzerLocked = true;
            this.stopTimer();
            this.state.buzzerWinner = teamIndex;
            this.state.status = "BUZZED";
            this.save();
            return this.state.teams[teamIndex].name;
        }
        return null;
    }

    handleAnswer(correct) {
        if (this.state.buzzerWinner !== null) {
            const points = this.state.rounds[this.state.currentRoundIndex].points || 0;
            const team = this.state.teams[this.state.buzzerWinner];
            const round = this.state.rounds[this.state.currentRoundIndex];
            round.scores = round.scores || {};

            if (correct) {
                team.score += points;
                round.scores[team.name] = (round.scores[team.name] || 0) + points;
            } else {
                team.score -= points;
                round.scores[team.name] = (round.scores[team.name] || 0) - points;
            }
        }
        this.state.status = "ANSWER_REVEALED";
        this.save();
    }

    revealAnswer() {
        this.state.status = "ANSWER_REVEALED";
        this.save();
    }

    setTeamScore(index, score) {
        if (index >= 0 && index < this.state.teams.length) {
            this.state.teams[index].score = score;
            this.save();
        }
    }

    returnToDashboard() {
        this.state.status = "DASHBOARD";
        this.save();
    }
}

module.exports = GameEngine;
