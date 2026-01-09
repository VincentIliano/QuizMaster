
const StandardRound = require('../models/StandardRound');
const FreezeOutRound = require('../models/FreezeOutRound');
const ConnectionsRound = require('../models/ConnectionsRound');
const CluesRound = require('../models/CluesRound');


class GameEngine {
    constructor(storage) {
        this.storage = storage;
        this.timerInterval = null;
        this.timerInterval = null;
        this.onTick = null; // Callback for timer ticks
        this.onPlaySfx = null; // Callback for sound effects
        this.onPenalty = null; // Callback for penalty events

        // Initial State

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

            roundStartScores: [], // Snapshot of scores at round start
            sequenceOptionIndex: -1,
            sequenceVotes: {}, // teamIndex -> optionIndex
            buzzerQueue: [], // Array of teamIndices
            listRoundActiveIndex: 0 // Index pointer for buzzerQueue
        };
        this.currentRoundInstance = null;
        this.init();
    }

    init() {
        const quizData = this.storage.loadQuizData();
        // Always use fresh round definitions
        this.state.rounds = quizData.rounds || [];
        this.state.falseStartPenalty = quizData.falseStartPenalty || 0;

        // Ensure rounds initialized with defaults
        console.log("GameEngine init: Initial rounds count:", this.state.rounds.length);
        this.state.rounds.forEach(r => {
            r.scores = r.scores || {};
            r.questionsAnswered = r.questionsAnswered || 0;
        });

        const savedState = this.storage.loadGameState();
        if (savedState && Object.keys(savedState).length > 0) {
            // Restore global state
            if (savedState.teams) {
                this.state.teams = savedState.teams;
                // Ensure history exists for legacy saves
                this.state.teams.forEach(t => {
                    if (!t.history) t.history = [];
                });
            }
            if (savedState.buzzerWinner !== undefined) this.state.buzzerWinner = savedState.buzzerWinner;
            if (savedState.status) this.state.status = savedState.status;
            if (savedState.lockedOutTeams) this.state.lockedOutTeams = savedState.lockedOutTeams;
            if (savedState.currentRoundIndex !== undefined) this.state.currentRoundIndex = savedState.currentRoundIndex;
            if (savedState.runningRoundIndex !== undefined) this.state.currentRoundIndex = savedState.currentRoundIndex;
            if (savedState.currentQuestionIndex !== undefined) this.state.currentQuestionIndex = savedState.currentQuestionIndex;
            if (savedState.currentQuestionData) this.state.currentQuestionData = savedState.currentQuestionData;
            if (savedState.roundStartScores) this.state.roundStartScores = savedState.roundStartScores;
            if (savedState.sequenceOptionIndex !== undefined) this.state.sequenceOptionIndex = savedState.sequenceOptionIndex;
            if (savedState.sequenceVotes) this.state.sequenceVotes = savedState.sequenceVotes;
            if (savedState.buzzerQueue) this.state.buzzerQueue = savedState.buzzerQueue;
            if (savedState.listRoundActiveIndex !== undefined) this.state.listRoundActiveIndex = savedState.listRoundActiveIndex;

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
        const ListRound = require('../models/ListRound');
        if (round.type && round.type.toLowerCase() === 'list') {
            this.currentRoundInstance = new ListRound(round);
        } else if (round.type === 'countdown') {
            this.currentRoundInstance = new FreezeOutRound(round);
        } else if (round.type === 'connections') {
            this.currentRoundInstance = new ConnectionsRound(round);
            this.currentRoundInstance.init(this); // Initialize grid
        } else if (round.type === 'clues') {
            this.currentRoundInstance = new CluesRound(round);
        } else if (round.type === 'yes' || round.type === 'sequence') {
            const SequenceRound = require('../models/SequenceRound');
            this.currentRoundInstance = new SequenceRound(round);
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
        // console.log("getPublicState: roundsSummary length:", s.roundsSummary ? s.roundsSummary.length : 'null');

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
            question: s.currentQuestionData ? (s.currentQuestionData.question || s.currentQuestionData.text || ((s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].type === 'connections' && s.currentQuestionData.groups) ? s.currentQuestionData.groups.map(g => g.name).join(', ') : "")) : "",
            mediaUrl: s.currentQuestionData ? s.currentQuestionData.mediaUrl : null,
            mediaType: s.currentQuestionData ? s.currentQuestionData.mediaType : null,
            roundsSummary: s.roundsSummary,

            // Restored Properties
            roundType: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? (s.rounds[s.currentRoundIndex].type ? s.rounds[s.currentRoundIndex].type.toLowerCase() : 'standard') : null,
            roundName: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].name : "",
            roundDescription: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].description : "",
            roundPoints: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? s.rounds[s.currentRoundIndex].points : 0,
            maxTime: (s.currentQuestionData && s.currentQuestionData.time_limit) ? s.currentQuestionData.time_limit : ((s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length) ? (s.rounds[s.currentRoundIndex].time_limit || 30) : 30),
            timeLimit: s.timerValue,
            status: s.status,
            teams: s.teams,
            buzzerWinner: s.buzzerWinner,
            lockedOutTeams: s.lockedOutTeams,
            currentAnswer: (s.currentQuestionData && (s.status === 'ANSWER_REVEALED' || s.status === 'GAME_OVER')) ? s.currentQuestionData.answer : null,
            answer: s.currentQuestionData ? s.currentQuestionData.answer : null,
            choices: s.currentQuestionData ? s.currentQuestionData.choices : null,
            options: s.currentQuestionData ? s.currentQuestionData.options : null, // Sequence Round Options
            answers: s.currentQuestionData ? s.currentQuestionData.answers : null,
            // Exposed for List Round
            revealedAnswers: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].foundAnswers) ? s.rounds[s.currentRoundIndex].foundAnswers : [],

            upcomingQuestion: upcomingQ ? (upcomingQ.text || ((s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].type === 'connections' && upcomingQ.groups) ? upcomingQ.groups.map(g => g.name).join(', ') : null)) : null,
            upcomingAnswer: upcomingQ ? upcomingQ.answer : null,
            lastJudgement: s.lastJudgement,
            mediaPlaying: s.mediaPlaying || false,

            roundStartScores: s.roundStartScores || [],
            gridItems: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].questions && s.currentQuestionIndex >= 0 && s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex]) ? s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex].gridItems : [],
            solvedGroups: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].questions && s.currentQuestionIndex >= 0 && s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex]) ? s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex].solvedGroups : [],
            groups: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].questions && s.currentQuestionIndex >= 0 && s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex]) ? s.rounds[s.currentRoundIndex].questions[s.currentQuestionIndex].groups : [],
            topic: s.currentQuestionData ? s.currentQuestionData.topic : null,
            topicRevealed: s.currentQuestionData ? s.currentQuestionData.topicRevealed : false,
            // Clues Round
            clues: s.currentQuestionData ? s.currentQuestionData.clues : null,
            cluesRevealedCount: s.cluesRevealed || 0,
            clueConfig: (s.currentRoundIndex >= 0 && s.currentRoundIndex < s.rounds.length && s.rounds[s.currentRoundIndex].type === 'clues') ? {
                initial: s.rounds[s.currentRoundIndex].initial_points || 15,
                reduction: s.rounds[s.currentRoundIndex].reduction_amount || 3
            } : null,

            finalStandings: s.finalStandings || [],
            finalStandings: s.finalStandings || [],
            finalistRevealCount: s.finalistRevealCount || 0,

            // Sequence Round
            sequenceOptionIndex: s.sequenceOptionIndex !== undefined ? s.sequenceOptionIndex : -1,
            sequenceVotes: s.sequenceVotes || {},

            // List Round
            buzzerQueue: s.buzzerQueue || [],
            listRoundActiveIndex: s.listRoundActiveIndex || 0
        };
    }

    getRounds() {
        return this.state.rounds;
    }

    // --- Actions ---

    hostSubmitAnswer(answer) {
        if (this.currentRoundInstance && typeof this.currentRoundInstance.handleAnswer === 'function') {
            const teamIndex = this.state.buzzerWinner;
            if (teamIndex !== null && teamIndex >= 0 && this.state.teams[teamIndex]) {
                this.currentRoundInstance.handleAnswer(this, teamIndex, answer);
            }
        }
    }

    setTeams(teamNames) {
        this.state.teams = teamNames.map(name => ({ name, score: 0, history: [] }));
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

            // Initialize timer for display (ROUND_READY screen)
            this.state.timerValue = r.time_limit || 30;

            this.save();
        }
    }

    nextQuestion(autoStart = false, onTick = null) {
        this.stopTimer();
        this.state.buzzerWinner = null;
        this.state.buzzerLocked = true;
        this.state.lastJudgement = null;
        this.state.buzzerWinner = null;
        this.state.buzzerLocked = true;
        this.state.lastJudgement = null;
        this.state.lockedOutTeams = [];
        this.state.sequenceOptionIndex = -1;
        this.state.sequenceVotes = {};
        this.state.buzzerQueue = [];
        this.state.listRoundActiveIndex = 0;

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

        // Start Locked (until startTimer is called, unless auto-start)
        this.state.buzzerLocked = true;

        // Force timerValue to 0 for Clues round
        if (currentRound.type === 'clues') {
            this.state.timerValue = 0;
        }

        // Setup Round Specifics (Generalized)
        if (this.currentRoundInstance && typeof this.currentRoundInstance.setupQuestion === 'function') {
            this.currentRoundInstance.setupQuestion(this, this.state.currentQuestionIndex);
        }

        if (this.currentRoundInstance instanceof ConnectionsRound) {
            // Additional timer overrides for connections?
            // Logic moved to ConnectionsRound.setupQuestion hopefully, but preserving explicit check if needed for legacy behavior?
            // Actually, ConnectionsRound.setupQuestion handles grid setup.
            // The override timer logic was here:
            this.state.timerValue = currentRound.time_limit || 60;
            this.startTimer(onTick);
            this.state.status = "LISTENING";
            this.save();
            return;
        }

        // Auto-start timer for Standard rounds (no type) as requested
        const type = (currentRound.type || 'standard').toLowerCase();
        if (type === 'standard' || type === 'list' || type === 'clues') {
            autoStart = true;
        }

        this.state.status = autoStart ? "LISTENING" : "READING";
        this.state.mediaPlaying = false;

        if (autoStart) {
            this.startTimer(onTick);
        } else {
            // Keep locked if Reading
            this.state.buzzerLocked = true;
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

            if (this.currentRoundInstance && typeof this.currentRoundInstance.setupQuestion === 'function') {
                this.currentRoundInstance.setupQuestion(this, this.state.currentQuestionIndex);
            }
        }
        this.save();
    }

    startTimer(onTick) {
        const tickHandler = onTick || this.onTick;

        if (this.state.status === 'ALL_LOCKED') return;

        if (this.state.timerValue > 0 && this.state.buzzerWinner === null && this.state.status !== 'TIMEOUT') {
            this.state.buzzerLocked = false;
            this.state.status = "LISTENING";
            this.state.mediaPlaying = true;
            this.save();

            this.stopTimer();

            // Fix: Check type on data object or state rounds (Case Insensitive)
            const roundData = (this.currentRoundInstance && this.currentRoundInstance.data) ||
                (this.state.rounds[this.state.currentRoundIndex]);

            const roundType = roundData && roundData.type ? roundData.type.toLowerCase() : '';
            const isUntimedRound = roundType === 'list' || roundType === 'clues';

            // For untimed rounds, we set status to LISTENING (above) but do NOT start the countdown interval
            if (isUntimedRound) return;

            this.timerInterval = setInterval(() => {
                this.state.timerValue--;
                if (tickHandler) tickHandler(this.state.timerValue);

                if (this.state.timerValue <= 0) {
                    if (this.currentRoundInstance && typeof this.currentRoundInstance.handleTimeout === 'function') {
                        this.currentRoundInstance.handleTimeout(this);
                    } else {
                        this.stopTimer();
                        this.state.buzzerLocked = true;
                        this.state.status = "TIMEOUT";
                        this.state.mediaPlaying = false;
                        this.save();
                    }
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
        console.log(`[GameEngine] handleBuzz team=${teamIndex} status=${this.state.status} locked=${this.state.buzzerLocked}`);

        // 1. Safety / Start-of-Game Checks
        // Ignore inputs during pure setup/idle screens to prevent accidents
        if (this.state.status === 'DASHBOARD' || this.state.status === 'IDLE' || this.state.status === 'ROUND_SUMMARY') {
            return null;
        }

        // 1.5. Validate Team Exists
        if (!this.state.teams[teamIndex]) {
            console.warn(`[GameEngine] Received buzz from invalid team index: ${teamIndex}`);
            return null;
        }

        // 2. Frozen Team Check
        if (this.state.lockedOutTeams.includes(teamIndex)) return null;

        // 3. Spam Protection
        // If this team is ALREADY the buzzer winner, ignore subsequent presses
        if (this.state.status === 'BUZZED' && this.state.buzzerWinner === teamIndex) {
            return null;
        }

        // 4. Check Instance Strategy for overrides (e.g. SequenceRound, ListRound)
        // MUST happen before standard LISTENING check to allow overriding behavior (e.g. queuing)
        if (this.currentRoundInstance && typeof this.currentRoundInstance.handleBuzz === 'function') {
            const result = this.currentRoundInstance.handleBuzz(this, teamIndex);
            if (result) return result; // Logic handled by strategy
        }

        // 5. Valid Buzz Condition: Status MUST be LISTENING
        // We also check locked just in case, but LISTENING implies unlocked usually.
        if (this.state.status === 'LISTENING') {
            // Valid Logic
            this.state.buzzerLocked = true;
            this.stopTimer();
            this.state.buzzerWinner = teamIndex;
            this.state.status = "BUZZED";
            this.state.mediaPlaying = false;
            this.state.connectionStreak = 0;
            this.save();
            return this.state.teams[teamIndex] ? this.state.teams[teamIndex].name : "Unknown Team";
        }

        // 5. Penalty Condition
        // Any buzzer press when NOT in LISTENING (and not earlier excluded) is a penalty
        if (this.state.teams[teamIndex]) {
            const penalty = this.state.falseStartPenalty || 0;
            console.log(`[GameEngine] Illegal buzz detected in status '${this.state.status}'. Penalty: ${penalty}`);

            if (penalty > 0) {
                this.state.teams[teamIndex].score -= penalty;
                this.save();
                this.playSfx('wrong');
                if (this.onPenalty) this.onPenalty(teamIndex, penalty);
                // Do NOT return name, do NOT change status to BUZZED
                return null;
            }
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

    revealAnswer(judgement = false) {
        this.state.lastJudgement = judgement;
        this.state.status = "ANSWER_REVEALED";
        this.state.buzzerLocked = true; // Ensure locked

        if (this.currentRoundInstance && typeof this.currentRoundInstance.onReveal === 'function') {
            this.currentRoundInstance.onReveal(this);
        }

        this.save();
    }

    setTeamScore(index, score) {
        if (this.state.teams[index]) {
            const oldScore = this.state.teams[index].score;
            const diff = score - oldScore;
            this.addPoints(index, diff, 'Manual Adjustment');
        }
    }

    addPoints(teamIndex, amount, reason) {
        if (!this.state.teams[teamIndex]) return;
        const team = this.state.teams[teamIndex];
        team.score += amount;

        if (!team.history) team.history = [];

        let roundName = 'N/A';
        if (this.state.currentRoundIndex >= 0 && this.state.rounds[this.state.currentRoundIndex]) {
            roundName = this.state.rounds[this.state.currentRoundIndex].name;
        }

        team.history.push({
            timestamp: Date.now(),
            amount: amount,
            reason: reason,
            newScore: team.score,
            round: roundName
        });
        this.save();
    }

    toggleMedia() {
        this.state.mediaPlaying = !this.state.mediaPlaying;
        this.save();
    }



    unfreezeTeam(teamIndex) {
        if (this.state.lockedOutTeams.includes(teamIndex)) {
            this.state.lockedOutTeams = this.state.lockedOutTeams.filter(i => i !== teamIndex);

            // If we were in ALL_LOCKED, switch to PAUSED so host can resume
            if (this.state.status === 'ALL_LOCKED') {
                this.state.status = 'PAUSED';
                this.state.buzzerLocked = true;
            }

            this.save();
        }
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
        this.stopTimer();
        this.state.currentRoundIndex = -1;
        this.returnToDashboard();
    }

    returnToDashboard() {
        this.stopTimer();
        this.state.status = "DASHBOARD";
        this.save();
    }

    revealConnectionGroup(groupIndex) {
        if (this.currentRoundInstance instanceof ConnectionsRound) {
            this.currentRoundInstance.revealGroup(this, groupIndex);
        }
    }

    revealTopic() {
        if (this.currentRoundInstance instanceof ConnectionsRound) {
            return this.currentRoundInstance.revealTopic(this);
        }
        return false;
    }

    revealClue() {
        if (this.currentRoundInstance && typeof this.currentRoundInstance.revealClue === 'function') {
            const revealed = this.currentRoundInstance.revealClue(this);
            if (revealed) {
                this.playSfx('clue_reveal'); // Optional sfx
                return true;
            }
        }
        return false;
    }


    playSfx(type) {
        console.log(`[GameEngine] playSfx requested: ${type}`);
        if (this.onPlaySfx) {
            this.onPlaySfx(type);
        } else {
            console.warn('[GameEngine] No onPlaySfx listener configured');
        }
    }

    goToFinalResults() {
        this.stopTimer();
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

    nextSequenceOption() {
        if (this.currentRoundInstance && typeof this.currentRoundInstance.nextOption === 'function') {
            this.currentRoundInstance.nextOption(this);
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
