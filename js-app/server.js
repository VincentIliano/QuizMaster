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
    status: "IDLE" // "IDLE", "READING", "LISTENING", "BUZZED", "TIMEOUT", "ANSWER_REVEALED", "GAME_OVER"
};

let gameTimer = null;

// Load Data
function loadData() {
    try {
        const dataPath = path.join(__dirname, '..', 'quiz_data.json');
        const rawData = fs.readFileSync(dataPath);
        const jsonData = JSON.parse(rawData);
        gameState.rounds = jsonData.rounds || [];
        console.log("Loaded rounds:", gameState.rounds.length);
    } catch (e) {
        console.error("Error loading quiz_data.json:", e);
        gameState.rounds = [];
    }
}

loadData();

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
        answer: gameState.currentQuestionData ? gameState.currentQuestionData.answer : null // Always sending answer for Host visibility
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
        if (gameState.currentQuestionIndex >= currentRound.questions.length) {
            gameState.currentRoundIndex++;
            gameState.currentQuestionIndex = 0;
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
    broadcastState();

    // Send specific event for question change if needed, but state_update covers it
}

function startTimer() {
    if (gameState.timerValue > 0 && gameState.buzzerWinner === null && gameState.status !== 'TIMEOUT') {
        gameState.buzzerLocked = false;
        gameState.status = "LISTENING";
        broadcastState();

        clearInterval(gameTimer);
        gameTimer = setInterval(() => {
            gameState.timerValue--;
            io.emit('timer_tick', gameState.timerValue);

            if (gameState.timerValue <= 0) {
                clearInterval(gameTimer);
                gameState.buzzerLocked = true;
                gameState.status = "TIMEOUT";
                broadcastState();
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
        broadcastState();
        io.emit('buzzed', gameState.teams[teamIndex].name); // Optional specific event
    }
}

function handleAnswer(correct) {
    if (gameState.buzzerWinner !== null) {
        const points = gameState.rounds[gameState.currentRoundIndex].points || 0;
        if (correct) {
            gameState.teams[gameState.buzzerWinner].score += points;
        } else {
            gameState.teams[gameState.buzzerWinner].score -= points;
        }
    }

    // Reveal Answer
    gameState.status = "ANSWER_REVEALED";
    broadcastState();
}

function revealAnswer() {
    gameState.status = "ANSWER_REVEALED";
    broadcastState();
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
        answer: gameState.currentQuestionData ? gameState.currentQuestionData.answer : null
    });

    // Host Actions
    socket.on('set_teams', (teamNames) => {
        gameState.teams = teamNames.map(name => ({ name, score: 0 }));
        // Reset game indices if setting teams implies new game
        gameState.currentRoundIndex = -1;
        gameState.currentQuestionIndex = -1;
        gameState.status = "IDLE";
        broadcastState();
    });

    socket.on('start_game', () => {
        if (gameState.rounds.length > 0) {
             // Reset to first question
             gameState.currentRoundIndex = -1; // nextQuestion will bump to 0
             gameState.currentQuestionIndex = -1;
             nextQuestion();
        }
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
