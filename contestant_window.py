from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QHBoxLayout, QFrame
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont, QPalette, QColor

class ContestantWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Quiz Contestant View")
        self.setStyleSheet("background-color: #1e1e2e; color: #cdd6f4;")
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Header: Round Name + Timer
        header_layout = QHBoxLayout()

        self.round_label = QLabel("Waiting to start...")
        self.round_label.setFont(QFont("Arial", 24, QFont.Weight.Bold))
        self.round_label.setStyleSheet("color: #fab387;")
        header_layout.addWidget(self.round_label, alignment=Qt.AlignmentFlag.AlignLeft)

        self.timer_label = QLabel("00")
        self.timer_label.setFont(QFont("Arial", 48, QFont.Weight.Bold))
        self.timer_label.setStyleSheet("color: #f38ba8;")
        header_layout.addWidget(self.timer_label, alignment=Qt.AlignmentFlag.AlignRight)

        layout.addLayout(header_layout)

        # Question Area
        self.question_label = QLabel("")
        self.question_label.setWordWrap(True)
        self.question_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.question_label.setFont(QFont("Arial", 40))
        layout.addWidget(self.question_label, stretch=3)

        # Status / Feedback Area (Who buzzed, Correct/Wrong)
        self.status_label = QLabel("")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_label.setFont(QFont("Arial", 32, QFont.Weight.Bold))
        self.status_label.setStyleSheet("color: #a6e3a1;")
        layout.addWidget(self.status_label, stretch=1)

        # Scoreboard
        self.scores_layout = QHBoxLayout()
        self.score_widgets = []
        layout.addLayout(self.scores_layout, stretch=1)

    def update_scores(self, teams_data):
        # specific update logic to keep references or rebuild
        # teams_data is list of (name, score)

        # Clear existing
        for i in reversed(range(self.scores_layout.count())):
            self.scores_layout.itemAt(i).widget().setParent(None)
        self.score_widgets = []

        for name, score in teams_data:
            frame = QFrame()
            frame.setStyleSheet("background-color: #313244; border-radius: 10px; padding: 10px;")
            vbox = QVBoxLayout()
            frame.setLayout(vbox)

            name_lbl = QLabel(name)
            name_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            name_lbl.setFont(QFont("Arial", 16, QFont.Weight.Bold))

            score_lbl = QLabel(str(score))
            score_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            score_lbl.setFont(QFont("Arial", 24, QFont.Weight.Bold))
            score_lbl.setStyleSheet("color: #89b4fa;")

            vbox.addWidget(name_lbl)
            vbox.addWidget(score_lbl)

            self.scores_layout.addWidget(frame)
            self.score_widgets.append(frame)

    def update_question(self, text, round_name, time_limit, points):
        self.question_label.setText(text)
        self.round_label.setText(f"{round_name} ({points} pts)")
        self.timer_label.setText(str(time_limit))
        self.status_label.setText("")
        self.reset_score_styles()

    def update_timer(self, value):
        self.timer_label.setText(str(value))

    def show_buzz(self, team_name):
        self.status_label.setText(f"{team_name} Buzzed!")
        self.status_label.setStyleSheet("color: #f9e2af;")

    def show_result(self, answer_text, is_correct, team_name=None):
        status = "CORRECT!" if is_correct else "WRONG!"
        color = "#a6e3a1" if is_correct else "#f38ba8"
        self.status_label.setText(f"{status}\nAnswer: {answer_text}")
        self.status_label.setStyleSheet(f"color: {color};")

    def reset_score_styles(self):
        # Reset any highlighting on scorecards
        for w in self.score_widgets:
            w.setStyleSheet("background-color: #313244; border-radius: 10px; padding: 10px;")

    def highlight_team(self, index, color_hex="#45475a"):
        if 0 <= index < len(self.score_widgets):
             self.score_widgets[index].setStyleSheet(f"background-color: {color_hex}; border-radius: 10px; padding: 10px; border: 2px solid #cba6f7;")
