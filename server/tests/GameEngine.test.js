
const GameEngine = require('../services/GameEngine');
const Storage = require('../services/Storage');

// Mock Storage
class MockStorage {
    constructor() {
        this.gameState = {};
        this.quizData = {
            rounds: [
                {
                    name: "Standard Round",
                    type: "standard",
                    points: 10,
                    questions: [
                        { text: "Q1", answer: "A1" },
                        { text: "Q2", answer: "A2" }
                    ]
                },
                {
                    name: "FreezeOut Round",
                    type: "countdown",
                    time_limit: 60,
                    questions: [
                        { text: "FQ1", answer: "FA1" }
                    ]
                },
                {
                    name: "Connections Round",
                    type: "connections",
                    groups: [
                        { name: "G1", items: ["1", "2", "3", "4"] }
                    ]
                }
            ]
        };
    }
    loadGameState() { return this.gameState; }
    saveGameState(state) { this.gameState = state; }
    loadQuizData() { return this.quizData; }
    saveQuizData() { }
}

describe('GameEngine', () => {
    let engine;
    let storage;

    beforeEach(() => {
        storage = new MockStorage();
        engine = new GameEngine(storage);
        engine.setTeams(["Team 1", "Team 2"]);
    });

    test('Initializes correctly', () => {
        expect(engine.state.teams).toHaveLength(2);
        expect(engine.state.status).toBe("DASHBOARD");
    });

    test('Standard Round Flow', () => {
        // Start Standard Round
        engine.setRound(0);
        expect(engine.state.currentRoundIndex).toBe(0);
        expect(engine.state.status).toBe("ROUND_READY");

        // Next Question - First call resets to IDLE
        engine.nextQuestion();
        expect(engine.state.status).toBe("IDLE");

        // Next Question - Second call loads question
        engine.nextQuestion();
        expect(engine.state.status).toBe("READING");
        expect(engine.state.currentQuestionData.text).toBe("Q1");

        // Start Timer
        engine.startTimer();
        expect(engine.state.status).toBe("LISTENING");

        // Buzz
        engine.handleBuzz(0);
        expect(engine.state.status).toBe("BUZZED");
        expect(engine.state.buzzerWinner).toBe(0);

        // Correct Answer
        engine.handleAnswer(true);
        expect(engine.state.status).toBe("ANSWER_REVEALED");
        expect(engine.state.teams[0].score).toBe(10);
    });

    test('FreezeOut Round Logic', () => {
        engine.setRound(1); // FreezeOut
        engine.nextQuestion(); // IDLE
        engine.nextQuestion(); // READING
        engine.startTimer();   // LISTENING

        // Team 1 gets it wrong
        engine.handleBuzz(0);
        engine.handleAnswer(false);

        // Should be locked out
        expect(engine.state.lockedOutTeams).toContain(0);
        // FreezeOut logic resumes timer if not all locked
        expect(engine.state.status).toBe("LISTENING");
    });
});
