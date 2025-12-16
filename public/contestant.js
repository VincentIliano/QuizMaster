const socket = io();

// Elements
const roundName = document.getElementById('round-name');
const timer = document.getElementById('timer');
const questionText = document.getElementById('question-text');
const statusMessage = document.getElementById('status-message');
const scoresContainer = document.getElementById('scores-container');

const screensaver = document.getElementById('screensaver');
const gameContainer = document.getElementById('game-container');

// State tracking for animations
let currentTeams = [];

socket.on('state_update', (state) => {
    // Basic Info

    // Screensaver Toggle
    if (state.status === 'DASHBOARD') {
        screensaver.style.display = 'flex';
        gameContainer.style.display = 'none';
        return; // Don't process other updates if in dashboard
    } else {
        screensaver.style.display = 'none';
        gameContainer.style.display = 'block';
    }

    if (state.roundName) {
        roundName.innerText = `${state.roundName} (${state.roundPoints} pts)`;
    } else {
        roundName.innerText = "";
    }

    // Timer
    timer.innerText = state.timeLimit;

    // Question - Handle reveal
    if (state.status === 'ANSWER_REVEALED') {
        questionText.innerHTML = `${state.question}<br><br><span style="color:#a6e3a1">Answer: ${state.currentAnswer}</span>`;
    } else if (state.status === 'GAME_OVER') {
        questionText.innerText = "GAME OVER";
    } else {
        questionText.innerText = state.question;
    }

    // Status / Feedback
    statusMessage.className = '';
    statusMessage.innerText = '';

    if (state.status === 'BUZZED' && state.buzzerWinner !== null) {
        const teamName = state.teams[state.buzzerWinner].name;
        statusMessage.innerText = `${teamName} Buzzed!`;
        statusMessage.classList.add('status-buzzed');
    } else if (state.status === 'TIMEOUT') {
        statusMessage.innerText = "TIME UP!";
        statusMessage.style.color = 'orange';
    }

    // Since we don't get "CORRECT/WRONG" explicitly in the state enum (it goes straight to revealed or we miss the transient event),
    // we might miss the animation for "Correct!".
    // Ideally the server should emit a specific event for 'judgement' to trigger animation, then update state.
    // But let's handle scores:
    updateScores(state.teams, state.buzzerWinner);
});

socket.on('timer_tick', (val) => {
    timer.innerText = val;
});

// We can listen for specific events if we want fancy transient animations
// For now, state updates are robust enough, but let's assume we want to flash "CORRECT"
// We'd need to change server to emit 'judgment_result' before state update or similar.
// But sticking to state_update is safer for sync.

function updateScores(teams, buzzerWinnerIndex) {
    // Diffing is hard without IDs, assuming index is stable
    scoresContainer.innerHTML = '';

    teams.forEach((team, index) => {
        const card = document.createElement('div');
        card.className = 'score-card';
        if (index === buzzerWinnerIndex) {
            card.classList.add('buzzed-card');
        }

        const name = document.createElement('h3');
        name.innerText = team.name;

        const score = document.createElement('span');
        score.innerText = team.score;

        card.appendChild(name);
        card.appendChild(score);
        scoresContainer.appendChild(card);
    });
}
