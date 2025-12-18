class GameEngine {
    constructor(storage) {
        this.storage = storage;
        this.timerInterval = null;
        this.onTick = null; // Callback for timer ticks

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
            lastJudgement: null, // true (correct), false (wrong), or null
            roundsSummary: [],
            lockedOutTeams: [], // Added for FreezeOut
            mediaPlaying: false // Added for manual media control
        };
        this.init();
    }

    init() {
        const quizData = this.storage.loadQuizData();
        // Always use fresh round definitions
        this.state.rounds = quizData.rounds || [];

        // Ensure rounds initialized with defaults
        this.state.rounds.forEach(r => {
            r.scores = r.scores || {};
            r.questionsAnswered = r.questionsAnswered || 0;
        });

        const savedState = this.storage.loadGameState();
        if (savedState) {
            // Restore global state
            if (savedState.teams) this.state.teams = savedState.teams;
            if (savedState.buzzerWinner !== undefined) this.state.buzzerWinner = savedState.buzzerWinner;
            if (savedState.status) this.state.status = savedState.status;
            if (savedState.lockedOutTeams) this.state.lockedOutTeams = savedState.lockedOutTeams;
            if (savedState.currentRoundIndex !== undefined) this.state.currentRoundIndex = savedState.currentRoundIndex;
            if (savedState.currentQuestionIndex !== undefined) this.state.currentQuestionIndex = savedState.currentQuestionIndex;
            if (savedState.currentQuestionData) this.state.currentQuestionData = savedState.currentQuestionData;
            // ... restore other non-round fields if needed, or just be selective.
            // Actually, we can assume savedState.rounds matches by index mostly, but strict names is better.

            // Restore Round Progress (Scores, Answered Count)
            if (savedState.rounds) {
                this.state.rounds.forEach((r, i) => {
                    // Try to find matching round in saved state by name, or fall back to index if names match?
                    // Simple approach: Use index if name matches, or just map if possible.
                    // Let's look for a round with the same name in savedState
                    const savedRound = savedState.rounds.find(sr => sr.name === r.name);
                    if (savedRound) {
                        r.scores = savedRound.scores || {};
                        r.questionsAnswered = savedRound.questionsAnswered || 0;
                    }
                });
            }

            // Force dashboard on load as per previous logic
            this.state.status = "DASHBOARD";
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

        // Calculate totalQuestions for current round if valid
        let totalQuestions = 0;
        if (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) {
            totalQuestions = s.rounds[s.currentRoundIndex].questions.length;
        }

        return {
            roundIndex: s.currentRoundIndex,
            questionIndex: s.currentQuestionIndex,
            totalQuestions: totalQuestions,
            question: s.currentQuestionData ? s.currentQuestionData.text : "",
            mediaUrl: s.currentQuestionData ? s.currentQuestionData.mediaUrl : null,
            mediaType: s.currentQuestionData ? s.currentQuestionData.mediaType : null,
            roundType: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].type : null,
            roundName: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].name : "",
            roundDescription: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].description : "",
            roundPoints: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].points : 0,
            maxTime: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? (s.rounds[s.currentRoundIndex].time_limit || 30) : 30,
            timeLimit: s.timerValue,
            status: s.status,
            teams: s.teams,
            buzzerWinner: s.buzzerWinner,
            lockedOutTeams: s.lockedOutTeams,
            currentAnswer: (s.currentQuestionData && (s.status === 'ANSWER_REVEALED' || s.status === 'GAME_OVER')) ? s.currentQuestionData.answer : null,
            answer: s.currentQuestionData ? s.currentQuestionData.answer : null,
            roundsSummary: s.roundsSummary,
            upcomingQuestion: upcomingQ ? upcomingQ.text : null,
            upcomingAnswer: upcomingQ ? upcomingQ.answer : null,
            upcomingAnswer: upcomingQ ? upcomingQ.answer : null,
            lastJudgement: s.lastJudgement,
            mediaPlaying: s.mediaPlaying || false
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
        this.state.lastJudgement = null;
        this.state.lockedOutTeams = [];

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
        this.state.buzzerLocked = false; // Unlock immediately for early buzzing
        this.state.status = autoStart ? "LISTENING" : "READING";

        // Disable auto-play by default. Media starts when timer starts or manual toggle.
        // If autoStart passed (rare), startTimer below will set it to true.
        this.state.mediaPlaying = false;

        // Auto-Start Timer if requested
        if (autoStart) {
            this.startTimer(onTick);
        } else {
            this.save();
        }
    }

    previousQuestion() {
        if (this.state.currentRoundIndex === -1) return;

        this.stopTimer();
        this.state.buzzerWinner = null;
        this.state.buzzerLocked = true;
        this.state.lastJudgement = null;

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
            this.state.buzzerLocked = false; // Unlock immediately
            // We don't update questionsAnswered or scores when going back, usually. 
            // Just navigation.
        }
        this.save();
    }

    startTimer(onTick) {
        // Use provided callback or stored callback
        const tickHandler = onTick || this.onTick;

        // Prevent starting if ALL_LOCKED
        if (this.state.status === 'ALL_LOCKED') return;

        // Allow resuming if answer was revealed (e.g. Wrong answer -> Resume)or from PAUSED/BUZZED
        if (this.state.status === 'ANSWER_REVEALED' || this.state.status === 'BUZZED' || this.state.status === 'PAUSED') {
            this.state.buzzerWinner = null;
            this.state.lastJudgement = null;
        }

        if (this.state.timerValue > 0 && this.state.buzzerWinner === null && this.state.status !== 'TIMEOUT') {
            this.state.buzzerLocked = false;
            this.state.status = "LISTENING";
            this.state.mediaPlaying = true; // Sync media: Play
            this.save();

            this.stopTimer();
            this.timerInterval = setInterval(() => {
                this.state.timerValue--;
                if (tickHandler) tickHandler(this.state.timerValue);

                if (this.state.timerValue <= 0) {
                    this.stopTimer();
                    this.state.buzzerLocked = true;
                    this.state.status = "TIMEOUT";
                    this.state.mediaPlaying = false; // Sync media: Stop
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

    pauseTimer() {
        if (this.state.status === 'LISTENING') {
            this.stopTimer();
            this.state.status = 'PAUSED';
            this.state.buzzerLocked = true; // Optionally lock buzzer while paused? Yes, fair.
            this.state.mediaPlaying = false; // Sync media: Pause
            this.save();
        }
    }

    handleBuzz(teamIndex) {
        if (this.state.buzzerLocked) return null;
        // Check lockout
        if (this.state.lockedOutTeams.includes(teamIndex)) return null;

        if (teamIndex >= 0 && teamIndex < this.state.teams.length) {
            this.state.buzzerLocked = true;
            this.stopTimer();
            this.state.buzzerWinner = teamIndex;
            this.state.status = "BUZZED";
            this.state.mediaPlaying = false; // Stop media on buzz
            this.save();
            return this.state.teams[teamIndex].name;
        }
        return null;
    }

    handleAnswer(correct) {
        this.stopTimer();

        // Logic for FreezeOut Round
        const currentRound = this.state.rounds[this.state.currentRoundIndex];
        const isFreezeOut = currentRound && currentRound.type === 'freezeout';

        if (isFreezeOut && this.state.buzzerWinner !== null) {
            if (correct) {
                // Score = timerValue
                const points = this.state.timerValue;
                const team = this.state.teams[this.state.buzzerWinner];
                currentRound.scores = currentRound.scores || {};

                team.score += points;
                currentRound.scores[team.name] = (currentRound.scores[team.name] || 0) + points;

                // Proceed to reveal/next normally
                this.state.lastJudgement = correct;
                this.state.status = "ANSWER_REVEALED";
                this.save();
                return;
            } else {
                // WRONG ANSWER in FreezeOut
                // No penalty (0 points), but lockout.
                // Do NOT reveal answer. Resume timer UNLESS all locked out.

                this.state.lockedOutTeams.push(this.state.buzzerWinner);
                this.state.buzzerWinner = null;
                this.state.buzzerLocked = false;

                // Check if ALL teams are locked out
                const allLocked = this.state.teams.every((_, i) => this.state.lockedOutTeams.includes(i));

                if (allLocked) {
                    this.state.status = "ALL_LOCKED";
                    this.state.buzzerLocked = true;
                    this.state.mediaPlaying = false; // Reset media state
                    // Timer is already stopped by this.stopTimer() at top of function
                } else {
                    // Resume timer
                    this.startTimer();
                }

                this.save();
                return;
            }
        }

        // Standard Logic
        if (this.state.buzzerWinner !== null) {
            const points = currentRound.points || 0;
            const team = this.state.teams[this.state.buzzerWinner];
            currentRound.scores = currentRound.scores || {};

            if (correct) {
                team.score += points;
                currentRound.scores[team.name] = (currentRound.scores[team.name] || 0) + points;
            } else {
                team.score -= points;
                currentRound.scores[team.name] = (currentRound.scores[team.name] || 0) - points;
            }
        }
        this.state.lastJudgement = correct;
        this.state.status = "ANSWER_REVEALED";
        this.save();
    }

    revealAnswer() {
        if (this.state.status === 'ALL_LOCKED') {
            this.state.lastJudgement = false; // Treat as wrong/failed round
        }
        this.state.status = "ANSWER_REVEALED";
        this.save();
    }

    setTeamScore(index, score) {
        if (this.state.teams[index]) {
            this.state.teams[index].score = score;
            this.save();
        }
    }

    toggleMedia() {
        this.state.mediaPlaying = !this.state.mediaPlaying;
        this.save();
    }

    returnToDashboard() {
        this.state.status = "DASHBOARD";
        this.save();
    }
}

module.exports = GameEngine;
