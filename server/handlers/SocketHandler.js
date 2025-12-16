module.exports = (io, gameEngine) => {
    // Setup state change listener
    gameEngine.onStateChange = (state) => {
        io.emit('state_update', state);
    };

    io.on('connection', (socket) => {
        console.log('Client connected');

        // Initial State
        socket.emit('state_update', gameEngine.getPublicState());

        socket.on('get_state', () => {
            socket.emit('state_update', gameEngine.getPublicState());
        });

        // Host Actions
        socket.on('set_teams', (names) => gameEngine.setTeams(names));

        socket.on('set_round', (index) => gameEngine.setRound(index));

        socket.on('next_question', (autoStart) => gameEngine.nextQuestion(autoStart, (val) => io.emit('timer_tick', val)));
        socket.on('previous_question', () => gameEngine.previousQuestion());

        socket.on('start_timer', () => {
            gameEngine.startTimer((val) => io.emit('timer_tick', val));
        });

        socket.on('host_buzz', (teamIndex) => {
            const buzzedName = gameEngine.handleBuzz(teamIndex);
            if (buzzedName) {
                // io.emit('buzzed', buzzedName); // Optional
            }
        });

        socket.on('update_score', (index, score) => gameEngine.setTeamScore(index, score));

        socket.on('judge_answer', (correct) => gameEngine.handleAnswer(correct));

        socket.on('reveal_answer', () => gameEngine.revealAnswer());

        socket.on('return_to_dashboard', () => gameEngine.returnToDashboard());
    });
};
