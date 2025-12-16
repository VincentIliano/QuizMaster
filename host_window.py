from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QHBoxLayout, QPushButton,
    QGroupBox, QFormLayout, QLineEdit, QDialog, QDialogButtonBox, QMessageBox
)
from PyQt6.QtCore import Qt, pyqtSignal

class TeamSetupDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Setup Teams")
        self.inputs = []

        layout = QVBoxLayout()
        form_layout = QFormLayout()

        for i in range(5):
            line_edit = QLineEdit()
            line_edit.setPlaceholderText(f"Team {i+1} Name")
            form_layout.addRow(f"Team {i+1}:", line_edit)
            self.inputs.append(line_edit)

        layout.addLayout(form_layout)

        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

        self.setLayout(layout)

    def get_teams(self):
        return [inp.text().strip() for inp in self.inputs if inp.text().strip()]

class HostWindow(QWidget):
    start_game_signal = pyqtSignal(list) # list of team names
    next_question_signal = pyqtSignal()
    start_timer_signal = pyqtSignal()
    correct_signal = pyqtSignal()
    wrong_signal = pyqtSignal()
    # Key press handling signals could be here or in main

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Quiz Host Control Panel")
        self.resize(600, 400)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()

        # Info Section
        info_group = QGroupBox("Current Status")
        info_layout = QFormLayout()

        self.lbl_round = QLabel("-")
        self.lbl_question = QLabel("-")
        self.lbl_answer = QLabel("-") # Hidden until needed? Or always visible to host? Host needs to see it.
        self.lbl_timer = QLabel("0")
        self.lbl_buzzer = QLabel("Waiting...")

        info_layout.addRow("Round:", self.lbl_round)
        info_layout.addRow("Question:", self.lbl_question)
        info_layout.addRow("Answer:", self.lbl_answer)
        info_layout.addRow("Timer:", self.lbl_timer)
        info_layout.addRow("Buzzer:", self.lbl_buzzer)

        info_group.setLayout(info_layout)
        layout.addWidget(info_group)

        # Controls
        controls_group = QGroupBox("Actions")
        controls_layout = QHBoxLayout()

        self.btn_next = QPushButton("Next Question")
        self.btn_next.clicked.connect(self.next_question_signal.emit)

        self.btn_timer = QPushButton("Start Timer")
        self.btn_timer.clicked.connect(self.start_timer_signal.emit)

        self.btn_correct = QPushButton("Correct")
        self.btn_correct.setStyleSheet("background-color: #a6e3a1; color: black;")
        self.btn_correct.clicked.connect(self.correct_signal.emit)
        self.btn_correct.setEnabled(False)

        self.btn_wrong = QPushButton("Wrong")
        self.btn_wrong.setStyleSheet("background-color: #f38ba8; color: black;")
        self.btn_wrong.clicked.connect(self.wrong_signal.emit)
        self.btn_wrong.setEnabled(False)

        self.btn_reveal = QPushButton("Reveal (Skip)")
        self.btn_reveal.clicked.connect(lambda: self.on_answer_revealed(correct=False)) # Treat skip as incorrect/neutral UI-wise
        self.btn_reveal.setEnabled(False)

        controls_layout.addWidget(self.btn_next)
        controls_layout.addWidget(self.btn_timer)
        controls_layout.addWidget(self.btn_correct)
        controls_layout.addWidget(self.btn_wrong)
        controls_layout.addWidget(self.btn_reveal)

        controls_group.setLayout(controls_layout)
        layout.addWidget(controls_group)

        # Setup Button (Initial)
        self.btn_setup = QPushButton("Setup Teams & Start")
        self.btn_setup.clicked.connect(self.show_setup_dialog)
        layout.addWidget(self.btn_setup)

        self.setLayout(layout)

    def show_setup_dialog(self):
        dlg = TeamSetupDialog(self)
        if dlg.exec():
            teams = dlg.get_teams()
            if not teams:
                QMessageBox.warning(self, "Error", "Please enter at least one team name.")
                return
            self.start_game_signal.emit(teams)
            self.btn_setup.setEnabled(False)
            self.btn_setup.hide()

    def update_info(self, question, answer, round_name, time_limit):
        self.lbl_question.setText(question)
        self.lbl_answer.setText(answer)
        self.lbl_round.setText(round_name)
        self.lbl_timer.setText(str(time_limit))
        self.lbl_buzzer.setText("Waiting for Timer start...")

        self.btn_next.setEnabled(False)
        self.btn_timer.setEnabled(True)
        self.btn_correct.setEnabled(False)
        self.btn_wrong.setEnabled(False)
        self.btn_reveal.setEnabled(False)

    def update_timer(self, value):
        self.lbl_timer.setText(str(value))

    def on_buzz(self, team_name):
        self.lbl_buzzer.setText(f"{team_name} BUZZED!")
        self.lbl_buzzer.setStyleSheet("color: red; font-weight: bold;")

        self.btn_correct.setEnabled(True)
        self.btn_wrong.setEnabled(True)
        self.btn_timer.setEnabled(False)

    def on_answer_revealed(self, correct):
        self.btn_next.setEnabled(True)
        self.btn_correct.setEnabled(False)
        self.btn_wrong.setEnabled(False)
        self.btn_reveal.setEnabled(False)
        self.lbl_buzzer.setStyleSheet("")
        if correct:
            self.lbl_buzzer.setText("Answer was CORRECT")
        else:
            self.lbl_buzzer.setText("Answer Revealed")

    def set_listening_state(self):
        self.lbl_buzzer.setText("Listening for Buzzers...")
        self.btn_timer.setEnabled(False)

    def on_timeout(self):
        self.lbl_buzzer.setText("TIME IS UP!")
        self.lbl_buzzer.setStyleSheet("color: orange; font-weight: bold;")
        self.btn_reveal.setEnabled(True)
        self.btn_timer.setEnabled(False)
