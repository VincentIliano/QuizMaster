
const Round = require('./Round');

class ConnectionsRound extends Round {
    constructor(roundData) {
        super(roundData);
    }

    /**
     * Initialize the grid if it doesn't exist
     * @param {GameEngine} engine 
     */
    init(engine) {
        // No global init needed, done per question
    }

    setupQuestion(engine, questionIndex) {
        const round = engine.state.rounds[engine.state.currentRoundIndex];
        const question = round.questions[questionIndex];

        if (!question.gridItems) {
            const allItems = [];
            question.groups.forEach((group, groupIndex) => {
                group.items.forEach(text => {
                    allItems.push({
                        text,
                        groupIndex,
                        id: Math.random().toString(36).substr(2, 9),
                        solved: false
                    });
                });
            });



            // Fix shuffle
            for (let i = allItems.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = allItems[i];
                allItems[i] = allItems[j];
                allItems[j] = temp;
            }

            question.gridItems = allItems;
            question.solvedGroups = [];
        }
    }

    handleAnswer(engine, teamIndex, correct) {
        const points = this.data.points || 0;
        const team = engine.state.teams[teamIndex];
        const round = engine.state.rounds[engine.state.currentRoundIndex];
        round.scores = round.scores || {};

        if (correct) {
            team.score += points;
            round.scores[teamIndex] = (round.scores[teamIndex] || 0) + points;
        } else {
            team.score -= points;
            round.scores[teamIndex] = (round.scores[teamIndex] || 0) - points;
        }

        engine.state.lastJudgement = correct;

        // Reset buzzer state so game can continue
        engine.state.buzzerWinner = null;
        engine.state.buzzerLocked = false;
        engine.state.status = 'IDLE';

        engine.save();
    }

    revealGroup(engine, groupIndex) {
        const round = engine.state.rounds[engine.state.currentRoundIndex];
        const question = round.questions[engine.state.currentQuestionIndex];

        if (!question) return;
        if (!question.solvedGroups) question.solvedGroups = [];

        if (!question.solvedGroups.includes(groupIndex)) {
            question.solvedGroups.push(groupIndex);

            // Mark items as solved
            question.gridItems.forEach(item => {
                if (item.groupIndex === groupIndex) {
                    item.solved = true;
                }
            });

            // Award points if a team has buzzed
            if (engine.state.buzzerWinner !== null) {
                const teamIndex = engine.state.buzzerWinner;

                // Exponential scoring: 10 * (streak + 1)
                const currentStreak = engine.state.connectionStreak || 0;
                const points = 10 * (currentStreak + 1);

                // Increment streak
                engine.state.connectionStreak = currentStreak + 1;

                round.scores = round.scores || {};
                engine.state.teams[teamIndex].score += points;
                round.scores[teamIndex] = (round.scores[teamIndex] || 0) + points;
            }

            engine.save();
        }
    }
}
module.exports = ConnectionsRound;
