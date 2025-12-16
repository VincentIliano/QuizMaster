const socket = io();

// Elements
const dashboardPanel = document.getElementById('dashboard-panel');
const setupPanel = dashboardPanel; // Alias for legacy if needed, or just replace
const controlPanel = document.getElementById('control-panel');
const teamInputs = document.querySelectorAll('.team-input');
const btnUpdateTeams = document.getElementById('btn-update-teams');
// const roundSelect = document.getElementById('round-select');
// const btnStartRound = document.getElementById('btn-start-round');
const roundTilesContainer = document.getElementById('round-tiles-container');
const btnStartGame = document.getElementById('btn-start-game'); // Likely removed in HTML replacement

const lblRound = document.getElementById('lbl-round');
const lblQuestion = document.getElementById('lbl-question');
const lblAnswer = document.getElementById('lbl-answer');
const lblTimer = document.getElementById('lbl-timer');
const lblStatus = document.getElementById('lbl-status');
const lblBuzzer = document.getElementById('lbl-buzzer');
const scoreList = document.getElementById('score-list');

const btnNext = document.getElementById('btn-next');
const btnTimer = document.getElementById('btn-timer');
const btnCorrect = document.getElementById('btn-correct');
const btnWrong = document.getElementById('btn-wrong');
const btnReveal = document.getElementById('btn-reveal');
const btnDashboard = document.getElementById('btn-dashboard');

// Setup
btnUpdateTeams.addEventListener('click', () => {
    const names = Array.from(teamInputs).map(input => input.value.trim()).filter(n => n);
    if (names.length === 0) {
        alert("Enter at least one team name");
        return;
    }
    socket.emit('set_teams', names);
    alert("Teams updated!");
});

/*
btnStartRound.addEventListener('click', () => {
    const roundIndex = parseInt(roundSelect.value);
    if (isNaN(roundIndex)) {
        alert("Select a round first");
        return;
    }
    socket.emit('set_round', roundIndex);
    // Control panel switch happens on state update
});
*/

function startRound(index) {
    socket.emit('set_round', index);
}

// Controls
btnNext.addEventListener('click', () => socket.emit('next_question'));
btnTimer.addEventListener('click', () => socket.emit('start_timer'));
btnCorrect.addEventListener('click', () => socket.emit('judge_answer', true));
btnWrong.addEventListener('click', () => socket.emit('judge_answer', false));
btnReveal.addEventListener('click', () => socket.emit('reveal_answer'));
btnDashboard.addEventListener('click', () => {
    socket.emit('return_to_dashboard');
});

// Keyboard Capture (Global within browser tab)
window.addEventListener('keydown', (e) => {
    // Keys 1-5
    if (e.key >= '1' && e.key <= '5') {
        const teamIndex = parseInt(e.key) - 1;
        socket.emit('host_buzz', teamIndex);
    }
});

// State Updates
socket.on('state_update', (state) => {
    // If we receive state and are in setup mode but teams are set, switch view (reconnection handling logic)
    // Dashboard / Control Panel Switching
    if (state.status === 'DASHBOARD') {
        dashboardPanel.style.display = 'block';
        controlPanel.style.display = 'none';
    } else {
        dashboardPanel.style.display = 'none';
        controlPanel.style.display = 'block';
    }

    // Populate Round Select if empty (and we have rounds)
    // We need rounds info. Ideally server sends it in state or separate Init.
    // Let's assume state has rounds meta or we ask for it?
    // Current state only has current round info.
    // We should patch server to send "allRounds" summary in the state or separate event.
    // For now, let's assume we might need to add that to server, OR we use the fact that
    // we might have received it.
    // Actually, I missed adding "rounds" list to broadcastState.
    // I'll add a separate socket.on('rounds_list') or similar.

    // Populate Round Tiles
    if (state.roundsSummary) {
        roundTilesContainer.innerHTML = '';
        state.roundsSummary.forEach(r => {
            const tile = document.createElement('div');
            tile.className = 'round-tile';
            if (r.questionsAnswered >= r.totalQuestions) {
                tile.classList.add('round-completed');
            }
            if (state.roundIndex === r.index && state.status !== 'DASHBOARD') {
                tile.classList.add('round-active');
            }

            const title = document.createElement('h3');
            title.innerText = r.name;
            tile.appendChild(title);

            const progress = document.createElement('div');
            progress.className = 'round-progress';
            progress.innerText = `${r.questionsAnswered} / ${r.totalQuestions}`;
            tile.appendChild(progress);

            // Scores mini-table
            if (r.scores && Object.keys(r.scores).length > 0) {
                const scoreTable = document.createElement('div');
                scoreTable.className = 'tile-scores';
                for (const [team, score] of Object.entries(r.scores)) {
                    const row = document.createElement('div');
                    row.innerText = `${team}: ${score}`;
                    scoreTable.appendChild(row);
                }
                tile.appendChild(scoreTable);
            }

            tile.addEventListener('click', () => startRound(r.index));
            roundTilesContainer.appendChild(tile);
        });
    }

    /*
    if (state.allRoundsNames && roundSelect.options.length <= 1) {
        state.allRoundsNames.forEach((name, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.innerText = name;
            roundSelect.appendChild(opt);
        });
    }
    */

    lblRound.innerText = `${state.roundName} (${state.roundPoints} pts)`;
    lblQuestion.innerText = state.question;
    // For Host, we might want to see the answer always if available in data,
    // but the server only sends it on reveal/gameover in 'currentAnswer' usually.
    // However, for the host to judge, they need to see the answer BEFORE reveal.
    // The current server logic sends 'currentAnswer' only on REVEAL.
    // I should update server.js to always send the answer to the Host?
    // Or just trust the Python logic which seemed to send it immediately to Host.
    lblAnswer.innerText = state.answer || "???";

    lblTimer.innerText = state.timeLimit;
    lblStatus.innerText = state.status;

    // Buzzer Text
    if (state.status === 'BUZZED' && state.buzzerWinner !== null) {
        const winnerName = state.teams[state.buzzerWinner].name;
        lblBuzzer.innerText = `${winnerName} BUZZED!`;
        lblBuzzer.style.color = 'red';
        btnCorrect.disabled = false;
        btnWrong.disabled = false;
    } else if (state.status === 'TIMEOUT') {
        lblBuzzer.innerText = "TIME UP!";
        btnReveal.disabled = false;
        btnCorrect.disabled = true;
        btnWrong.disabled = true;
    } else if (state.status === 'ANSWER_REVEALED') {
        lblBuzzer.innerText = "Answer Revealed";
        lblBuzzer.style.color = 'black';
        btnCorrect.disabled = true;
        btnWrong.disabled = true;
        btnNext.disabled = false;
        btnReveal.disabled = true;
    } else {
        lblBuzzer.innerText = "Waiting...";
        lblBuzzer.style.color = 'black';
        btnCorrect.disabled = true;
        btnWrong.disabled = true;
    }

    // Button states based on status
    if (state.status === 'READING') {
        btnTimer.disabled = false;
        btnNext.disabled = true;
    } else if (state.status === 'LISTENING') {
        btnTimer.disabled = true;
        btnNext.disabled = true;
    }

    // Scores
    scoreList.innerHTML = '';
    state.teams.forEach(t => {
        const li = document.createElement('li');
        li.innerText = `${t.name}: ${t.score}`;
        scoreList.appendChild(li);
    });
});

socket.on('timer_tick', (val) => {
    lblTimer.innerText = val;
});
