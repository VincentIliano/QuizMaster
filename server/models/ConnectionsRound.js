
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
        const round = engine.state.rounds[engine.state.currentRoundIndex];

        // Initialize Grid if missing
        if (!round.gridItems) {
            const allItems = [];
            this.data.groups.forEach((group, groupIndex) => {
                group.items.forEach(text => {
                    allItems.push({
                        text,
                        groupIndex,
                        id: Math.random().toString(36).substr(2, 9), // Unique ID for React keys
                        solved: false
                    });
                });
            });

            // Shuffle
            for (let i = allItems.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
            }

            round.gridItems = allItems;
            round.solvedGroups = []; // Indices of solved groups
        }
    }

    handleAnswer(engine, teamIndex, correct) {
        // Standard points logic for getting a group right? 
        // Or just unlocking?
        // User spec says: "The Contestant buzzes in... Host presses button... items marked 'Solved'"
        // implies the "Host Reveal" IS the confirmation of a correct answer.
        // So we might award points when the Host reveals a group IF a team is currently the "Buzzer Winner".

        // This method might strictly be "Host judged the SHOUTED answer correct/wrong"
        // If Correct -> Host will THEN press "Reveal Group".
        // Use StandardRound scoring logic for simplicity if they buzz and answer.

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
        engine.save();
    }

    revealGroup(engine, groupIndex) {
        const round = engine.state.rounds[engine.state.currentRoundIndex];
        if (!round.solvedGroups) round.solvedGroups = [];

        if (!round.solvedGroups.includes(groupIndex)) {
            round.solvedGroups.push(groupIndex);

            // Mark items as solved
            round.gridItems.forEach(item => {
                if (item.groupIndex === groupIndex) {
                    item.solved = true;
                }
            });

            engine.save();
        }
    }
}

module.exports = ConnectionsRound;
