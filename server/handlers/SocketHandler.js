module.exports = (io, gameEngine) => {
    // Setup state change listener
    gameEngine.onStateChange = (state) => {
        io.emit('state_update', state);
    };

    // Setup Timer Tick listener
    gameEngine.onTick = (val) => {
        io.emit('timer_tick', val);
    };

    // Setup SFX listener
    gameEngine.onPlaySfx = (type) => {
        io.emit('play_sfx', type);
    };

    io.on('connection', (socket) => {
        console.log('Client connected');

        // Initial State
        socket.emit('state_update', gameEngine.getPublicState());

        socket.on('get_state', () => {
            socket.emit('state_update', gameEngine.getPublicState());
        });

        socket.on('reveal_topic', () => {
            const pointsAwarded = gameEngine.revealTopic();
            if (pointsAwarded) {
                io.emit('play_sfx', 'correct');
            }
            io.emit('state_update', gameEngine.getPublicState());
        });

        // Host Actions
        socket.on('set_teams', (names) => gameEngine.setTeams(names));

        socket.on('set_round', (index) => gameEngine.setRound(index));

        socket.on('next_question', (autoStart) => gameEngine.nextQuestion(autoStart, (val) => io.emit('timer_tick', val)));
        socket.on('previous_question', () => gameEngine.previousQuestion());

        socket.on('start_timer', () => {
            gameEngine.startTimer((val) => io.emit('timer_tick', val));
        });

        socket.on('pause_timer', () => {
            gameEngine.pauseTimer();
        });

        socket.on('toggle_media', () => {
            gameEngine.toggleMedia();
        });


        socket.on('buzz', (teamIndex) => {
            const buzzedName = gameEngine.handleBuzz(teamIndex);
            if (buzzedName) {
                io.emit('buzzed', buzzedName);
            }
        });

        socket.on('host_buzz', (teamIndex) => {
            const buzzedName = gameEngine.handleBuzz(teamIndex);
            if (buzzedName) {
                // io.emit('buzzed', buzzedName); // Optional
            }
        });

        socket.on('host_submit_answer', (answer) => gameEngine.hostSubmitAnswer(answer));

        socket.on('update_score', (index, score) => gameEngine.setTeamScore(index, score));

        socket.on('judge_answer', (correct) => gameEngine.handleAnswer(correct));

        socket.on('reveal_answer', () => gameEngine.revealAnswer());

        socket.on('end_round_early', () => gameEngine.endRoundEarly());

        socket.on('unfreeze_team', (teamIndex) => {
            gameEngine.unfreezeTeam(parseInt(teamIndex));
        });

        socket.on('finish_round', () => gameEngine.finishRound());

        socket.on('reveal_connection', (groupIndex) => gameEngine.revealConnectionGroup(groupIndex));

        socket.on('reset_round', (index) => gameEngine.resetRound(index));

        socket.on('go_to_final_results', () => gameEngine.goToFinalResults());
        socket.on('reveal_next_finalist', () => gameEngine.revealNextFinalist());

        socket.on('update_quiz_data', (data) => gameEngine.updateQuizData(data));

        socket.on('get_rounds', (callback) => {
            if (callback) callback(gameEngine.getRounds());
        });

        socket.on('return_to_dashboard', () => gameEngine.returnToDashboard());
    });
};
