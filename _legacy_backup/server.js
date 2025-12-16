const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Global Game State
const gameState = {
    teams: [], // { name: string, score: number }
    rounds: [],
    currentRoundIndex: -1,
    currentQuestionIndex: -1,
    currentQuestionData: null,
    timerValue: 0,
    buzzerLocked: true,
    buzzerWinner: null,
    status: "DASHBOARD" // "DASHBOARD", "IDLE", "READING", "LISTENING", "BUZZED", "TIMEOUT", "ANSWER_REVEALED", "GAME_OVER"
};

let gameTimer = null;

// Load Data
function loadData() {
    try {
        const dataPath = path.join(__dirname, 'quiz_data.json');
        const rawData = fs.readFileSync(dataPath);
        const jsonData = JSON.parse(rawData);
        gameState.rounds = jsonData.rounds || [];
        gameState.rounds.forEach(r => {
            r.scores = r.scores || {};
            r.questionsAnswered = r.questionsAnswered || 0;
        });
        console.log("Loaded rounds:", gameState.rounds.length);
    } catch (e) {
        console.error("Error loading quiz_data.json:", e);
        gameState.rounds = [];
    }
}

loadData();

// Persistence
function saveGame() {
    try {
        const statePath = path.join(__dirname, 'game_state.json');
        // Only save what's needed, or everything? Everything is easier but "rounds" is static.
        // However, restoring everything allows seamless continue.
        // For safety, let's persist everything.
        fs.writeFileSync(statePath, JSON.stringify(gameState, null, 2));
    } catch (e) {
        console.error("Error saving game state:", e);
    }
}

function loadSavedGame() {
    try {
        const statePath = path.join(__dirname, 'game_state.json');
        if (fs.existsSync(statePath)) {
            const raw = fs.readFileSync(statePath);
            const saved = JSON.parse(raw);
            Object.assign(gameState, saved);

            // Re-initialize dynamic fields if missing from save (e.g. old save file or filtered save)
            if (gameState.rounds) {
                gameState.rounds.forEach(r => {
                    r.scores = r.scores || {};
                    r.questionsAnswered = r.questionsAnswered || 0;
                });
            }

            // Force status to Dashboard on startup, so Host sees the options
            gameState.status = "DASHBOARD";
            console.log("Game state restored from disk.");
        }
    } catch (e) {
        console.error("Error loading saved game:", e);
    }
}

loadSavedGame();

// Logic Functions
function broadcastState() {
    // Send relevant state to all clients
    // In a real app, you might send diffs, but sending full state for simplicity
    io.emit('state_update', {
        roundIndex: gameState.currentRoundIndex,
        questionIndex: gameState.currentQuestionIndex,
        question: gameState.currentQuestionData ? gameState.currentQuestionData.text : "",
        roundName: (gameState.currentRoundIndex >= 0 && gameState.currentRoundIndex < gameState.rounds.length) ? gameState.rounds[gameState.currentRoundIndex].name : "",
        roundPoints: (gameState.currentRoundIndex >= 0 && gameState.currentRoundIndex < gameState.rounds.length) ? gameState.rounds[gameState.currentRoundIndex].points : 0,
        timeLimit: gameState.timerValue,
        status: gameState.status,
        teams: gameState.teams,
        buzzerWinner: gameState.buzzerWinner, // Index
        currentAnswer: (gameState.currentQuestionData && (gameState.status === 'ANSWER_REVEALED' || gameState.status === 'GAME_OVER')) ? gameState.currentQuestionData.answer : null,
        answer: gameState.currentQuestionData ? gameState.currentQuestionData.answer : null, // Always sending answer for Host visibility
        // allRoundsNames: gameState.rounds.map(r => r.name) // Deprecated in favor of full summary
        roundsSummary: gameState.rounds.map((r, i) => ({
            index: i,
            name: r.name,
            points: r.points,
            questionsAnswered: r.questionsAnswered,
            totalQuestions: r.questions ? r.questions.length : 0,
            scores: r.scores
        }))
    });
}

function nextQuestion() {
    clearInterval(gameTimer);
    gameState.buzzerWinner = null;
    gameState.buzzerLocked = true;

    // Advance logic
    if (gameState.currentRoundIndex === -1) {
        // First start
        gameState.currentRoundIndex = 0;
        gameState.currentQuestionIndex = 0;
    } else {
        gameState.currentQuestionIndex++;
        const currentRound = gameState.rounds[gameState.currentRoundIndex];
        // Mark progress
        // Actually, questionsAnswered should track "completed" questions.
        // If we are at index 0, 0 answered. If we finish index 0, 1 answered.
        // Let's update questionsAnswered when we finish a question/move to next? 
        // Or just map it to currentQuestionIndex if active?
        // Simpler: questionsAnswered = max(currentQuestionIndex, recorded).
        // Let's update it when we successfully complete a question or just set it to currentQuestionIndex at start of reading.

        if (gameState.currentQuestionIndex >= currentRound.questions.length) {
            // Round finished
            currentRound.questionsAnswered = currentRound.questions.length;
            gameState.currentRoundIndex++;
            gameState.currentQuestionIndex = 0;
        } else {
            // currentQuestionIndex is now X. So we are initiating Question X+1.
            // questionsAnswered is X.
            currentRound.questionsAnswered = gameState.currentQuestionIndex;
        }
    }

    if (gameState.currentRoundIndex >= gameState.rounds.length) {
        gameState.status = "GAME_OVER";
        gameState.currentQuestionData = null;
        broadcastState();
        return;
    }

    const currentRound = gameState.rounds[gameState.currentRoundIndex];
    gameState.currentQuestionData = currentRound.questions[gameState.currentQuestionIndex];
    gameState.timerValue = currentRound.time_limit || 30;
    gameState.status = "READING";
    gameState.status = "READING";
    broadcastState();
    saveGame();

    // Send specific event for question change if needed, but state_update covers it
}

function startTimer() {
    if (gameState.timerValue > 0 && gameState.buzzerWinner === null && gameState.status !== 'TIMEOUT') {
        gameState.buzzerLocked = false;
        gameState.status = "LISTENING";
        gameState.status = "LISTENING";
        broadcastState();
        saveGame();

        clearInterval(gameTimer);
        gameTimer = setInterval(() => {
            gameState.timerValue--;
            io.emit('timer_tick', gameState.timerValue);

            if (gameState.timerValue <= 0) {
                clearInterval(gameTimer);
                gameState.buzzerLocked = true;
                gameState.status = "TIMEOUT";
                gameState.status = "TIMEOUT";
                broadcastState();
                saveGame();
            }
        }, 1000);
    }
}

function handleBuzz(teamIndex) {
    if (gameState.buzzerLocked) return;

    if (teamIndex >= 0 && teamIndex < gameState.teams.length) {
        gameState.buzzerLocked = true;
        clearInterval(gameTimer);
        gameState.buzzerWinner = teamIndex;
        gameState.status = "BUZZED";
        gameState.status = "BUZZED";
        broadcastState();
        saveGame();
        io.emit('buzzed', gameState.teams[teamIndex].name); // Optional specific event
    }
}

function handleAnswer(correct) {
    if (gameState.buzzerWinner !== null) {
        const points = gameState.rounds[gameState.currentRoundIndex].points || 0;
        if (correct) {
            gameState.teams[gameState.buzzerWinner].score += points;

            // Round Score
            const teamName = gameState.teams[gameState.buzzerWinner].name;
            const currentRound = gameState.rounds[gameState.currentRoundIndex];
            currentRound.scores = currentRound.scores || {};
            currentRound.scores[teamName] = (currentRound.scores[teamName] || 0) + points;

        } else {
            gameState.teams[gameState.buzzerWinner].score -= points;
            // Round Score deduc? Usually yes.
            const teamName = gameState.teams[gameState.buzzerWinner].name;
            const currentRound = gameState.rounds[gameState.currentRoundIndex];
            currentRound.scores = currentRound.scores || {};
            currentRound.scores[teamName] = (currentRound.scores[teamName] || 0) - points;
        }
    }

    // Reveal Answer
    gameState.status = "ANSWER_REVEALED";
    gameState.status = "ANSWER_REVEALED";
    broadcastState();
    saveGame();
}

function revealAnswer() {
    gameState.status = "ANSWER_REVEALED";
    gameState.status = "ANSWER_REVEALED";
    broadcastState();
    saveGame();
}


io.on('connection', (socket) => {
    console.log('User connected');

    // Send initial state
    socket.emit('state_update', {
        // ... construct state same as broadcast ...
        roundIndex: gameState.currentRoundIndex,
        questionIndex: gameState.currentQuestionIndex,
        question: gameState.currentQuestionData ? gameState.currentQuestionData.text : "Waiting to start...",
        roundName: (gameState.currentRoundIndex >= 0 && gameState.currentRoundIndex < gameState.rounds.length) ? gameState.rounds[gameState.currentRoundIndex].name : "",
        roundPoints: (gameState.currentRoundIndex >= 0 && gameState.currentRoundIndex < gameState.rounds.length) ? gameState.rounds[gameState.currentRoundIndex].points : 0,
        timeLimit: gameState.timerValue,
        status: gameState.status,
        teams: gameState.teams,
        buzzerWinner: gameState.buzzerWinner,
        currentAnswer: (gameState.currentQuestionData && (gameState.status === 'ANSWER_REVEALED' || gameState.status === 'GAME_OVER')) ? gameState.currentQuestionData.answer : null,
        answer: gameState.currentQuestionData ? gameState.currentQuestionData.answer : null,
        allRoundsNames: gameState.rounds.map(r => r.name)
    });

    // Host Actions
    socket.on('set_teams', (teamNames) => {
        console.log('Setting teams:', teamNames);
        gameState.teams = teamNames.map(name => ({ name, score: 0 }));
        // Reset game indices if setting teams implies new game
        gameState.currentRoundIndex = -1;
        gameState.currentQuestionIndex = -1;
        gameState.status = "IDLE";
        // If teams are set, remain in Dashboard or move to IDLE? Dashboard is better.
        // But if we want to "Start Game" from Dashboard, we might not need to force IDLE here.
        // Let's keep current status or force DASHBOARD.
        gameState.status = "DASHBOARD";
        broadcastState();
        saveGame();
    });

    socket.on('set_round', (roundIndex) => {
        console.log('Setting round:', roundIndex);
        if (roundIndex >= 0 && roundIndex < gameState.rounds.length) {
            gameState.currentRoundIndex = roundIndex;
            // Resume from questionsAnswered?
            // If we have answered 2, we should start at index 2 (which is the 3rd question).
            const r = gameState.rounds[roundIndex];
            gameState.currentQuestionIndex = (r.questionsAnswered !== undefined) ? r.questionsAnswered - 1 : -1;
            // The nextQuestion() call in client usually triggers 'next_question' event? 
            // Wait, standard flow is: set_round -> IDLE -> Host clicks "Next Question" -> nextQuestion() -> increments index -> READING.
            // So if we have answered 2 (index 0, 1 done), we want nextQuestion to bump to 2.
            // So current should be 1.
            // If questionsAnswered is 0, current should be -1.
            gameState.currentQuestionIndex = (r.questionsAnswered || 0) - 1;

            gameState.status = "IDLE"; // Ready to read first question of round
            broadcastState();
            saveGame();
        }
    });

    socket.on('start_game', () => {
        console.log('Starting game');
        if (gameState.rounds.length > 0) {
            // Reset to first question
            gameState.currentRoundIndex = -1; // nextQuestion will bump to 0
            gameState.currentQuestionIndex = -1;
            nextQuestion();
        }
    });

    socket.on('return_to_dashboard', () => {
        console.log('Return to dashboard requested');
        gameState.status = "DASHBOARD";
        broadcastState();
        saveGame();
    });

    socket.on('next_question', () => {
        nextQuestion();
    });

    socket.on('start_timer', () => {
        startTimer();
    });

    socket.on('host_buzz', (teamIndex) => {
        handleBuzz(teamIndex);
    });

    socket.on('judge_answer', (isCorrect) => {
        handleAnswer(isCorrect);
    });

    socket.on('reveal_answer', () => {
        revealAnswer();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
