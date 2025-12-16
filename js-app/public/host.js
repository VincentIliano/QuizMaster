const socket = io();

// Elements
const setupPanel = document.getElementById('setup-panel');
const controlPanel = document.getElementById('control-panel');
const teamInputs = document.querySelectorAll('.team-input');
const btnStartGame = document.getElementById('btn-start-game');

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

// Setup
btnStartGame.addEventListener('click', () => {
    const names = Array.from(teamInputs).map(input => input.value.trim()).filter(n => n);
    if (names.length === 0) {
        alert("Enter at least one team name");
        return;
    }
    socket.emit('set_teams', names);
    socket.emit('start_game');
    setupPanel.style.display = 'none';
    controlPanel.style.display = 'block';
});

// Controls
btnNext.addEventListener('click', () => socket.emit('next_question'));
btnTimer.addEventListener('click', () => socket.emit('start_timer'));
btnCorrect.addEventListener('click', () => socket.emit('judge_answer', true));
btnWrong.addEventListener('click', () => socket.emit('judge_answer', false));
btnReveal.addEventListener('click', () => socket.emit('reveal_answer'));

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
    if (setupPanel.style.display !== 'none' && state.teams.length > 0 && state.roundIndex >= 0) {
        setupPanel.style.display = 'none';
        controlPanel.style.display = 'block';
    }

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
