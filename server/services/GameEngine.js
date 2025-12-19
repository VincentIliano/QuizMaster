
const StandardRound = require('../models/StandardRound');
const FreezeOutRound = require('../models/FreezeOutRound');
const ConnectionsRound = require('../models/ConnectionsRound');

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
            mediaPlaying: false, // Added for manual media control
            roundStartScores: [] // Snapshot of scores at round start
        };
        this.currentRoundInstance = null;
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
            if (savedState.runningRoundIndex !== undefined) this.state.currentRoundIndex = savedState.currentRoundIndex;
            if (savedState.currentQuestionIndex !== undefined) this.state.currentQuestionIndex = savedState.currentQuestionIndex;
            if (savedState.currentQuestionData) this.state.currentQuestionData = savedState.currentQuestionData;
            if (savedState.roundStartScores) this.state.roundStartScores = savedState.roundStartScores;

            // Restore Round Progress (Scores, Answered Count)
            if (savedState.rounds) {
                this.state.rounds.forEach((r, i) => {
                    const savedRound = savedState.rounds.find(sr => sr.name === r.name);
                    if (savedRound) {
                        r.scores = savedRound.scores || {};
                        r.questionsAnswered = savedRound.questionsAnswered || 0;
                    }
                });
            }

            // Restore Strategy Instance
            if (this.state.currentRoundIndex >= 0 && this.state.currentRoundIndex < this.state.rounds.length) {
                this._initRoundStrategy(this.state.currentRoundIndex);
            }

            // Force dashboard on load as per previous logic (optional, keeping it conservative)
            this.state.status = "DASHBOARD";
        }

        this.updateSummary();
    }

    _initRoundStrategy(index) {
        const round = this.state.rounds[index];
        if (round.type === 'countdown') {
            this.currentRoundInstance = new FreezeOutRound(round);
        } else if (round.type === 'connections') {
            this.currentRoundInstance = new ConnectionsRound(round);
            this.currentRoundInstance.init(this); // Initialize grid
        } else {
            this.currentRoundInstance = new StandardRound(round);
        }
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
            totalQuestions: r.questions ? r.questions.length : (r.groups ? r.groups.length : 0),
            scores: r.scores
        }));
    }

    getPublicState() {
        const s = this.state;

        let upcomingQ = null;
        if (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) {
            const r = s.rounds[s.currentRoundIndex];
            // Use currentQuestionIndex + 1 to force "next" question preview
            // Fallback to 0 if index is -1 (ROUND_READY)
            const nextIndex = (s.currentQuestionIndex >= 0) ? s.currentQuestionIndex + 1 : 0;

            if (r.questions && nextIndex < r.questions.length) {
                upcomingQ = r.questions[nextIndex];
            }
        }

        // Calculate totalQuestions for current round if valid
        let totalQuestions = 0;
        if (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) {
            const r = s.rounds[s.currentRoundIndex];
            totalQuestions = r.questions ? r.questions.length : (r.groups ? r.groups.length : 0);
        }

        return {
            roundIndex: s.currentRoundIndex,
            questionIndex: s.currentQuestionIndex,
            totalQuestions: totalQuestions,
            question: s.currentQuestionData ? (s.currentQuestionData.text || ((s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].type === 'connections' && s.currentQuestionData.groups) ? s.currentQuestionData.groups.map(g => g.name).join(', ') : "")) : "",
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
            upcomingQuestion: upcomingQ ? (upcomingQ.text || ((s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].type === 'connections' && upcomingQ.groups) ? upcomingQ.groups.map(g => g.name).join(', ') : null)) : null,
            upcomingAnswer: upcomingQ ? upcomingQ.answer : null,
            lastJudgement: s.lastJudgement,
            lastJudgement: s.lastJudgement,
            mediaPlaying: s.mediaPlaying || false,
            roundStartScores: s.roundStartScores || [],
            gridItems: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].questions && s.currentQuestionIndex >= 0 && s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex]) ? s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex].gridItems : [],
            solvedGroups: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].questions && s.currentQuestionIndex >= 0 && s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex]) ? s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex].solvedGroups : [],
            groups: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].questions && s.currentQuestionIndex >= 0 && s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex]) ? s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex].groups : [],
            finalStandings: s.finalStandings || [],
            finalistRevealCount: s.finalistRevealCount || 0
        };
    }

    getRounds() {
        return this.state.rounds;
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
            this._initRoundStrategy(roundIndex);

            const r = this.state.rounds[roundIndex];

            this.state.currentQuestionIndex = (r.questionsAnswered || 0) - 1;
            this.state.status = "ROUND_READY";

            // Snapshot scores for summary calculation
            this.state.roundStartScores = this.state.teams.map(t => t.score);

            this.save();
        }
    }

    nextQuestion(autoStart = false, onTick = null) {
        this.stopTimer();
        this.state.buzzerWinner = null;
        this.state.buzzerLocked = true;
        this.state.lastJudgement = null;
        this.state.lockedOutTeams = [];

        if (this.state.status === 'ROUND_READY') {
            this.state.status = "IDLE";
            this.state.currentQuestionData = null;
            const currentRound = this.state.rounds[this.state.currentRoundIndex];

            // For Connections, initialize timer immediately and fall through to load logic
            if (currentRound.type === 'connections') {
                // Initialize for first question (index 0)
                this.state.currentQuestionIndex = currentRound.questionsAnswered || 0;
                // Fall through to allow setupQuestion to run below
            } else {
                this.state.currentQuestionIndex = (currentRound.questionsAnswered || 0) - 1;
                this.save();
                return;
            }
        } else {
            if (this.state.currentRoundIndex === -1) {
                this.state.currentRoundIndex = 0;
                this.state.currentQuestionIndex = 0;
                this._initRoundStrategy(0);
            } else {
                this.state.currentQuestionIndex++;
                const currentRound = this.state.rounds[this.state.currentRoundIndex];

                if (this.state.currentQuestionIndex >= currentRound.questions.length) {
                    currentRound.questionsAnswered = currentRound.questions.length;
                    // Stay on this round index for summary
                    this.state.status = "ROUND_SUMMARY";
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
        this.state.buzzerLocked = false;

        // Setup Grid for Connections
        if (this.currentRoundInstance instanceof ConnectionsRound) {
            this.currentRoundInstance.setupQuestion(this, this.state.currentQuestionIndex);
            // Override timer 
            this.state.timerValue = currentRound.time_limit || 60;

            // Auto-start timer when grid is revealed (per user request)
            this.startTimer(onTick);
            this.state.status = "LISTENING";
            this.save();
            return;
        }

        this.state.status = autoStart ? "LISTENING" : "READING";
        this.state.mediaPlaying = false;

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
            this.state.status = "ROUND_READY";
            this.state.currentQuestionData = null;
        } else {
            const currentRound = this.state.rounds[this.state.currentRoundIndex];
            this.state.currentQuestionData = currentRound.questions[this.state.currentQuestionIndex];
            this.state.timerValue = currentRound.time_limit || 30;
            this.state.status = "READING";
            this.state.buzzerLocked = false;
        }
        this.save();
    }

    startTimer(onTick) {
        const tickHandler = onTick || this.onTick;

        if (this.state.status === 'ALL_LOCKED') return;

        if (this.state.status === 'ANSWER_REVEALED' || this.state.status === 'BUZZED' || this.state.status === 'PAUSED') {
            this.state.buzzerWinner = null;
            this.state.lastJudgement = null;
            this.state.connectionStreak = 0;
        }

        if (this.state.timerValue > 0 && this.state.buzzerWinner === null && this.state.status !== 'TIMEOUT') {
            this.state.buzzerLocked = false;
            this.state.status = "LISTENING";
            this.state.mediaPlaying = true;
            this.save();

            this.stopTimer();
            this.timerInterval = setInterval(() => {
                this.state.timerValue--;
                if (tickHandler) tickHandler(this.state.timerValue);

                if (this.state.timerValue <= 0) {
                    this.stopTimer();
                    this.state.buzzerLocked = true;
                    this.state.status = "TIMEOUT";
                    this.state.mediaPlaying = false;
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
            this.state.buzzerLocked = true;
            this.state.mediaPlaying = false;
            this.save();
        }
    }

    handleBuzz(teamIndex) {
        if (this.state.buzzerLocked) return null;
        if (this.state.lockedOutTeams.includes(teamIndex)) return null;

        if (teamIndex >= 0 && teamIndex < this.state.teams.length) {
            this.state.buzzerLocked = true;
            this.stopTimer();
            this.state.buzzerWinner = teamIndex;
            this.state.status = "BUZZED";
            this.state.mediaPlaying = false;
            // Initialize connection streak for new buzzer winner
            this.state.connectionStreak = 0;
            this.save();
            return this.state.teams[teamIndex].name;
        }
        return null;
    }

    handleAnswer(correct) {
        this.stopTimer();
        if (this.state.buzzerWinner !== null && this.currentRoundInstance) {
            this.currentRoundInstance.handleAnswer(this, this.state.buzzerWinner, correct);
        } else {
            // Fallback for unexpected state or missing strategy ?
            // For now, assume it's fine.
        }
    }

    revealAnswer() {
        this.state.lastJudgement = false;
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

    endRoundEarly() {
        if (this.state.currentRoundIndex !== -1) {
            this.stopTimer();
            this.state.buzzerWinner = null;
            this.state.buzzerLocked = true;
            this.state.lastJudgement = null;
            this.state.mediaPlaying = false;

            this.state.status = "ROUND_SUMMARY";
            this.save();
        }
    }

    finishRound() {
        this.state.currentRoundIndex = -1;
        this.returnToDashboard();
    }

    returnToDashboard() {
        this.state.status = "DASHBOARD";
        this.save();
    }

    revealConnectionGroup(groupIndex) {
        if (this.currentRoundInstance instanceof ConnectionsRound) {
            this.currentRoundInstance.revealGroup(this, groupIndex);
        }
    }

    goToFinalResults() {
        // Sort teams by score ascending (lowest first) for the "reveal default"
        // But actually typical podium is 3rd, 2nd, 1st?
        // User said: "last player first... until all players are on screen" based on REVEAL ORDER.
        // So we want the LOWEST score to be revealed FIRST.
        // Let's store them sorted by Score ASCENDING.
        this.state.finalStandings = [...this.state.teams]
            .map((t, i) => ({ ...t, originalIndex: i }))
            .sort((a, b) => a.score - b.score);

        this.state.finalistRevealIndex = 0; // -1? No, 0 means show 0 teams? Or index of next to reveal?
        // Let's say revealCount. 0 = none shown.
        this.state.finalistRevealCount = 0;

        this.state.status = "FINAL_RESULTS";
        this.save();
    }

    revealNextFinalist() {
        if (this.state.status === 'FINAL_RESULTS') {
            if (this.state.finalistRevealCount < this.state.teams.length) {
                this.state.finalistRevealCount++;
                this.save();
            }
        }
    }

    updateQuizData(newRounds) {
        if (!newRounds || !Array.isArray(newRounds)) return;

        // 1. Update Runtime State
        // Preserve runtime properties (scores, questionsAnswered) if round index/name matches?
        // Actually, user might reorder rounds. 
        // Simplest strategy: Overwrite rounds but try to preserve scores if name matches?
        // Or just reset? If editing LIVE game, changing a round might be destructive.
        // Let's assume editing implies a form of reset or manual management.
        // But we should try to keep `questionsAnswered` if possible.

        // For now, let's just replace. If the Host edits the current round, things might get weird.
        // Ideally edits happen before the game or between rounds.

        this.state.rounds = newRounds;

        // Ensure defaults
        this.state.rounds.forEach(r => {
            r.scores = r.scores || {};
            r.questionsAnswered = r.questionsAnswered || 0;
        });

        // 2. Persist to quiz_data.json (clean format)
        const cleanRounds = newRounds.map(r => {
            const clean = { ...r };
            // Remove runtime fields
            delete clean.scores;
            delete clean.questionsAnswered;
            delete clean.gridItems; // Connections specific
            // clean.questions need sanitization too?
            if (clean.questions) {
                clean.questions = clean.questions.map(q => {
                    const cleanQ = { ...q };
                    delete cleanQ.solvedGroups;
                    delete cleanQ.gridItems;
                    return cleanQ;
                });
            }
            return clean;
        });

        this.storage.saveQuizData({ rounds: cleanRounds });

        // 3. Persist Game State and Broadcast
        this.save();
    }

    resetRound(roundIndex) {
        if (roundIndex >= 0 && roundIndex < this.state.rounds.length) {
            const round = this.state.rounds[roundIndex];

            // Deduct scores earned in this round from global team scores
            if (round.scores) {
                Object.entries(round.scores).forEach(([teamIndex, score]) => {
                    const idx = parseInt(teamIndex);
                    if (!isNaN(idx) && this.state.teams[idx]) {
                        this.state.teams[idx].score -= score;
                    }
                });
            }

            round.questionsAnswered = 0;
            round.scores = {};

            // Clear connections formatting if needed
            if (round.type === 'connections' && round.questions) {
                // Clear gridItems so they are regenerated fresh
                round.questions.forEach(q => {
                    q.gridItems = null;
                    q.solvedGroups = [];
                });
            } else if (round.type === 'connections' && round.gridItems) {
                // Legacy single-question format
                round.gridItems = null;
                round.solvedGroups = [];
            }

            this.save();
        }
    }
}

module.exports = GameEngine;
