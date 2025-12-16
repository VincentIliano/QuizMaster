import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QUrl, Qt, QObject
import os

try:
    from PyQt6.QtMultimedia import QSoundEffect
except ImportError:
    QSoundEffect = None

from quiz_logic import QuizLogic
from host_window import HostWindow
from contestant_window import ContestantWindow

class QuizApp(QObject):
    def __init__(self):
        super().__init__()
        self.app = QApplication(sys.argv)

        # Initialize Logic
        self.logic = QuizLogic("quiz_data.json")

        # Initialize Windows
        self.host_window = HostWindow()
        self.contestant_window = ContestantWindow()

        # Sound
        self.buzz_sound = None
        if QSoundEffect:
            try:
                self.buzz_sound = QSoundEffect()
                self.buzz_sound.setSource(QUrl.fromLocalFile(os.path.abspath("buzz.wav")))
                self.buzz_sound.setVolume(1.0)
            except Exception as e:
                print(f"Audio initialization failed: {e}")

        self.setup_connections()

        # Show Windows
        self.host_window.show()
        self.contestant_window.showFullScreen()

        # Install global event filter to capture keys (1-5) even if host window has focus
        self.app.installEventFilter(self)

    def setup_connections(self):
        # Host -> Logic
        self.host_window.start_game_signal.connect(self.logic.set_teams)
        self.host_window.start_game_signal.connect(self.logic.start_game)
        self.host_window.next_question_signal.connect(self.logic.next_question)
        self.host_window.start_timer_signal.connect(self.logic.start_timer)
        self.host_window.correct_signal.connect(self.logic.handle_correct_answer)
        self.host_window.wrong_signal.connect(self.logic.handle_wrong_answer)

        # Logic -> Host
        self.logic.question_changed.connect(lambda q, r, t, p: self.host_window.update_info(q, self.logic.get_current_answer(), r, t))
        self.logic.timer_updated.connect(self.host_window.update_timer)
        self.logic.buzzed.connect(self.on_team_buzzed_host_update)
        self.logic.answer_revealed.connect(lambda _, c: self.host_window.on_answer_revealed(c))
        self.logic.game_state_changed.connect(self.handle_game_state_host)
        self.logic.timer_expired.connect(self.host_window.on_timeout)

        # Logic -> Contestant
        self.logic.question_changed.connect(self.contestant_window.update_question)
        self.logic.timer_updated.connect(self.contestant_window.update_timer)
        self.logic.scores_updated.connect(self.contestant_window.update_scores)
        self.logic.buzzed.connect(self.on_team_buzzed_contestant_update)
        self.logic.answer_revealed.connect(self.contestant_window.show_result)

    def on_team_buzzed_host_update(self, team_index):
        team_name = self.logic.teams[team_index]["name"]
        self.host_window.on_buzz(team_name)
        if self.buzz_sound:
            self.buzz_sound.play()

    def on_team_buzzed_contestant_update(self, team_index):
        team_name = self.logic.teams[team_index]["name"]
        self.contestant_window.show_buzz(team_name)
        self.contestant_window.highlight_team(team_index)

    def handle_game_state_host(self, state):
        if state == "LISTENING":
            self.host_window.set_listening_state()

    # Event Filter for Global Key Presses (Simulating Remotes)
    def eventFilter(self, obj, event):
        if event.type() == event.Type.KeyPress:
            key = event.key()
            # Keys 1-5 map to teams 0-4
            if Qt.Key.Key_1 <= key <= Qt.Key.Key_5:
                team_index = key - Qt.Key.Key_1
                self.logic.handle_buzz(team_index)
                return True # Event handled
        return super(QuizApp, self).eventFilter(obj, event)

    def run(self):
        sys.exit(self.app.exec())

if __name__ == "__main__":
    game = QuizApp()
    game.run()
