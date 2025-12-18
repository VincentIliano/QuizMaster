/* --- SENDER CODE (BUTTON) ---
   Board: LOLIN(WEMOS) D1 R2 & mini
*/
11111111111111
#include <ESP8266WiFi.h>
#include <espnow.h>

// ==========================================
// 1. PASTE YOUR HUB MAC ADDRESS HERE:
uint8_t receiverMac[] = {0x80, 0x65, 0x99, 0xEF, 0xC6, 0xD2}; 

// 2. CHANGE THIS NUMBER FOR EACH BUTTON (1, 2, 3, or 4)
#define PLAYER_ID 1 
// ==========================================

// Pin Definitions
const int BUTTON_PIN = 5; // Pin D1 on the board is GPIO 5

// Data Structure
typedef struct struct_message {
  int player_id;
} struct_message;

struct_message myData;

// Variables for the "Instant Trigger" (Interrupts)
volatile bool buttonPressed = false;
unsigned long lastPressTime = 0;

// --- INTERRUPT FUNCTION (Runs extremely fast) ---
IRAM_ATTR void handleButtonPress() {
  // Simple "Debounce" to prevent double-clicks (wait 300ms)
  if (millis() - lastPressTime > 300) {
    buttonPressed = true;
    lastPressTime = millis();
  }
}

void setup() {
  Serial.begin(115200);
  
  // Setup Button Pin
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Attach Interrupt: "Watch Pin D1. If it drops to LOW, run handleButtonPress immediately."
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), handleButtonPress, FALLING);

  // Init WiFi Mode
  WiFi.mode(WIFI_STA);

  // Init ESP-NOW
  if (esp_now_init() != 0) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }

  // Register the Hub (Receiver)
  esp_now_set_self_role(ESP_NOW_ROLE_CONTROLLER);
  esp_now_add_peer(receiverMac, ESP_NOW_ROLE_SLAVE, 1, NULL, 0);
  
  myData.player_id = PLAYER_ID;
  Serial.print("Ready! I am Player ");
  Serial.println(PLAYER_ID);
}

void loop() {
  // If the button was pressed...
  if (buttonPressed) {
    // Send the message
    esp_now_send(receiverMac, (uint8_t *) &myData, sizeof(myData));
    Serial.println("SENT!");
    
    // Reset the flag
    buttonPressed = false;
  }
}