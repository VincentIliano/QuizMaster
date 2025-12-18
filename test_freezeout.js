const GameEngine = require('./server/services/GameEngine');

// Mock Storage
const mockStorage = {
    loadQuizData: () => ({
        rounds: [{
            name: "FreezeOut",
            type: "freezeout",
            points: 0,
            time_limit: 10,
            questions: [{ text: "Q1", answer: "A1" }]
        }]
    }),
    loadGameState: () => null,
    saveGameState: (state) => { }
};

const game = new GameEngine(mockStorage);
game.setTeams(["Team A", "Team B", "Team C"]);
game.setRound(0); // Round Ready
game.nextQuestion(); // IDLE
game.nextQuestion(); // READING
game.startTimer(); // LISTENING

console.log("Status:", game.state.status);
console.log("Timer:", game.state.timerValue);

// Wait 2s (Timer = 8)
setTimeout(() => {
    console.log("--- Team A Buzzes at ~8s ---");
    game.handleBuzz(0); // Team A
    console.log("Status:", game.state.status); // BUZZED
    console.log("LockedOut:", game.state.lockedOutTeams);

    // Host marks WRONG
    console.log("--- Host marks WRONG ---");
    game.handleAnswer(false);

    console.log("Status (should be LISTENING/READING):", game.state.status);
    console.log("LockedOut:", game.state.lockedOutTeams); // Should include 0
    console.log("Timer Value maintained:", game.state.timerValue);

    // Try Team A buzz again
    const buzzResult = game.handleBuzz(0);
    console.log("Team A tries to buzz again:", buzzResult); // Should be null

    // Wait 2s (Timer = 6)
    setTimeout(() => {
        console.log("--- Team B Buzzes at ~6s ---");
        game.handleBuzz(1); // Team B
        console.log("Status:", game.state.status);

        // Host marks CORRECT
        console.log("--- Host marks CORRECT ---");
        game.handleAnswer(true);

        console.log("Status:", game.state.status);
        console.log("Team B Score (Should be ~6):", game.state.teams[1].score);
        console.log("Team A Score (Should be 0):", game.state.teams[0].score);

        if (game.state.teams[1].score > 0 && game.state.lockedOutTeams.includes(0)) {
            console.log("SUCCESS: FreezeOut mechanics verified.");
        } else {
            console.log("FAILURE: Scores or lockout incorrect.");
        }
        process.exit(0);
    }, 2000);

}, 2000);
