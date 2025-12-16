import json
from PyQt6.QtCore import QObject, pyqtSignal, QTimer

class QuizLogic(QObject):
    # Signals to update UI
    question_changed = pyqtSignal(str, str, int, int) # question_text, round_name, time_limit, points
    timer_updated = pyqtSignal(int)
    timer_expired = pyqtSignal()
    buzzed = pyqtSignal(int) # team_index
    scores_updated = pyqtSignal(list) # list of (name, score) tuples
    answer_revealed = pyqtSignal(str, bool) # answer_text, is_correct (if applicable - though reveal is usually just showing the text)
    # is_correct in answer_revealed might be redundant if we just show the string,
    # but the host handles correctness. Let's just say reveal sends the text.

    game_state_changed = pyqtSignal(str) # "IDLE", "READING", "BUZZED", "ANSWER_REVEALED", "TIMEOUT"

    def __init__(self, json_path):
        super().__init__()
        self.teams = [] # List of {"name": "Team 1", "score": 0}
        self.rounds = []
        self.current_round_index = -1
        self.current_question_index = -1
        self.current_question_data = None
        self.timer_value = 0
        self.timer = QTimer()
        self.timer.timeout.connect(self.tick_timer)
        self.buzzer_locked = True
        self.buzzer_winner = None # Index of team who buzzed

        self.load_data(json_path)

    def load_data(self, path):
        try:
            with open(path, 'r') as f:
                data = json.load(f)
                self.rounds = data.get("rounds", [])
        except Exception as e:
            print(f"Error loading JSON: {e}")
            self.rounds = []

    def set_teams(self, team_names):
        self.teams = [{"name": name, "score": 0} for name in team_names if name]
        self.scores_updated.emit([(t["name"], t["score"]) for t in self.teams])

    def start_game(self):
        if not self.rounds:
            return
        self.current_round_index = 0
        self.current_question_index = -1
        self.next_question()

    def next_question(self):
        self.buzzer_winner = None
        self.buzzer_locked = True
        self.timer.stop()

        # Advance index
        self.current_question_index += 1

        # Check if round is finished
        if self.current_question_index >= len(self.rounds[self.current_round_index]["questions"]):
            self.current_round_index += 1
            self.current_question_index = 0

            # Check if game is finished
            if self.current_round_index >= len(self.rounds):
                self.game_state_changed.emit("GAME_OVER")
                self.question_changed.emit("Game Over!", "", 0, 0)
                return

        current_round = self.rounds[self.current_round_index]
        self.current_question_data = current_round["questions"][self.current_question_index]
        self.timer_value = current_round.get("time_limit", 30)

        self.question_changed.emit(
            self.current_question_data["text"],
            current_round.get("name", ""),
            self.timer_value,
            current_round.get("points", 0)
        )
        self.timer_updated.emit(self.timer_value)
        self.game_state_changed.emit("READING")

    def start_timer(self):
        if self.timer_value > 0 and self.buzzer_winner is None:
            self.buzzer_locked = False
            self.timer.start(1000)
            self.game_state_changed.emit("LISTENING")

    def tick_timer(self):
        self.timer_value -= 1
        self.timer_updated.emit(self.timer_value)
        if self.timer_value <= 0:
            self.timer.stop()
            self.buzzer_locked = True
            self.timer_expired.emit()
            self.game_state_changed.emit("TIMEOUT")

    def handle_buzz(self, team_index):
        if self.buzzer_locked:
            return

        if 0 <= team_index < len(self.teams):
            self.buzzer_locked = True
            self.timer.stop()
            self.buzzer_winner = team_index
            self.buzzed.emit(team_index)
            self.game_state_changed.emit("BUZZED")

    def handle_correct_answer(self):
        if self.buzzer_winner is not None:
            points = self.rounds[self.current_round_index].get("points", 0)
            self.teams[self.buzzer_winner]["score"] += points
            self.scores_updated.emit([(t["name"], t["score"]) for t in self.teams])
            self.reveal_answer(correct=True)

    def handle_wrong_answer(self):
        if self.buzzer_winner is not None:
            points = self.rounds[self.current_round_index].get("points", 0)
            self.teams[self.buzzer_winner]["score"] -= points
            self.scores_updated.emit([(t["name"], t["score"]) for t in self.teams])
            # If wrong, do we continue the timer?
            # The prompt says: "host presses button that reveals the answer and if it's correct or wrong"
            # This implies the round ends for this question after one attempt (simplest interpretation).
            # Or we could re-open buzzers.
            # "show the fastest player on the tv -> host presses button that reveals the answer and if it's correct or wrong"
            # I will assume the question ends.
            self.reveal_answer(correct=False)

    def reveal_answer(self, correct):
        if self.current_question_data:
             # We might want to pass if the specific user was correct or not to the UI
             self.answer_revealed.emit(self.current_question_data["answer"], correct)
             self.game_state_changed.emit("ANSWER_REVEALED")

    def get_current_answer(self):
        if self.current_question_data:
            return self.current_question_data["answer"]
        return ""
