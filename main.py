import sys
import os
from PyQt6.QtWidgets import (QApplication, QMainWindow, QLabel, QPushButton, 
                             QVBoxLayout, QWidget, QGridLayout)
from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtMultimedia import QSoundEffect
from PyQt6.QtGui import QFont, QColor

# CONFIGURATION
TEAM_NAMES = ["THE KNOW-IT-ALLS", "QUIZ KHALIFAS", "LES MISERABLES", "UNIVERSAL EXPORTS"]
TEAM_COLORS = ["#FF5733", "#33FF57", "#3357FF", "#F333FF"] # Red, Green, Blue, Purple

class TVWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("TV Display")
        self.label = QLabel("ROUND 1", self)
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setCentralWidget(self.label)
        
        # Default TV Style
        self.default_style = "background-color: black; color: white; font-size: 100px; font-weight: bold;"
        self.label.setStyleSheet(self.default_style)

    def show_winner(self, team_name, color_code):
        self.label.setText(team_name)
        # Flash the screen with the team's color
        self.label.setStyleSheet(f"background-color: {color_code}; color: white; font-size: 120px; font-weight: bold;")

    def reset_display(self):
        self.label.setText("READY...")
        self.label.setStyleSheet(self.default_style)

class ControlPanel(QMainWindow):
    def __init__(self, tv_window):
        super().__init__()
        self.tv = tv_window
        self.locked = False
        self.setWindowTitle("Quizmaster Control")
        self.setGeometry(100, 100, 400, 300)

        # Setup Sound
        self.buzz_sound = QSoundEffect()
        self.buzz_sound.setSource(QUrl.fromLocalFile(os.path.abspath("buzz.wav")))
        self.buzz_sound.setVolume(1.0)

        # UI Layout
        layout = QVBoxLayout()
        
        self.status_label = QLabel("STATUS: OPEN")
        self.status_label.setFont(QFont("Arial", 20))
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.status_label)

        # Visual Grid of Teams (Admin View)
        grid = QGridLayout()
        self.team_labels = []
        for i, name in enumerate(TEAM_NAMES):
            lbl = QLabel(f"{i+1}: {name}")
            lbl.setStyleSheet("border: 1px solid gray; padding: 10px; font-weight: bold;")
            lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.team_labels.append(lbl)
            grid.addWidget(lbl, i // 2, i % 2)
        layout.addLayout(grid)

        # Reset Button
        self.reset_btn = QPushButton("RESET LOCKOUT (Spacebar)")
        self.reset_btn.setFont(QFont("Arial", 14))
        self.reset_btn.clicked.connect(self.reset_game)
        self.reset_btn.setStyleSheet("background-color: #ddd; padding: 20px;")
        layout.addWidget(self.reset_btn)

        container = QWidget()
        container.setLayout(layout)
        self.setCentralWidget(container)

    def keyPressEvent(self, event):
        # Press SPACE to reset
        if event.key() == Qt.Key.Key_Space:
            self.reset_game()
            return

        # If locked, ignore other inputs
        if self.locked:
            return
            
        # Check for numeric keys 1-4
        key_text = event.text()
        if key_text in ['1', '2', '3', '4']:
            index = int(key_text) - 1
            self.lock_in(index)

    def lock_in(self, team_index):
        self.locked = True
        team_name = TEAM_NAMES[team_index]
        color = TEAM_COLORS[team_index]

        # 1. Play Sound
        self.buzz_sound.play()

        # 2. Update Admin Panel
        self.status_label.setText(f"WINNER: {team_name}")
        self.status_label.setStyleSheet(f"background-color: {color}; color: white;")
        
        # Highlight specific team in grid
        for i, lbl in enumerate(self.team_labels):
            if i == team_index:
                lbl.setStyleSheet(f"background-color: {color}; color: white; border: 3px solid black;")
            else:
                lbl.setStyleSheet("opacity: 0.2; color: gray;")

        # 3. Update TV
        self.tv.show_winner(team_name, color)

    def reset_game(self):
        self.locked = False
        self.status_label.setText("STATUS: OPEN")
        self.status_label.setStyleSheet("background-color: white; color: black;")
        
        # Reset Admin Grid
        for lbl in self.team_labels:
            lbl.setStyleSheet("border: 1px solid gray; padding: 10px; font-weight: bold;")
            
        # Reset TV
        self.tv.reset_display()

# --- MAIN EXECUTION ---
app = QApplication(sys.argv)
tv = TVWindow()
control = ControlPanel(tv)

# Auto-detect monitors
screens = app.screens()
if len(screens) > 1:
    # Move TV window to the second monitor (index 1)
    monitor = screens[1].geometry()
    tv.move(monitor.left(), monitor.top())
    tv.showFullScreen()
else:
    # If no second monitor, just show it normally for testing
    tv.show()
    tv.resize(600, 400)

control.show()
sys.exit(app.exec())