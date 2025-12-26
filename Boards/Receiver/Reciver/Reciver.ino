/* --- RECEIVER CODE (USB HUB) ---
   Board: LOLIN S2 Mini
   Note: In Tools menu, set "USB CDC On Boot" to "Enabled"
*/

#include <esp_now.h>
#include <WiFi.h>
#include "USB.h"
#include "USBHIDKeyboard.h"

USBHIDKeyboard Keyboard;

// Structure to receive data
typedef struct struct_message {
  int player_id;
} struct_message;

struct_message incomingData;

// --- CALLBACK: When a signal arrives ---
void OnDataRecv(const uint8_t * mac, const uint8_t *incomingData, int len) {
  struct_message *data = (struct_message *)incomingData;
  
  // Debug to Serial Monitor
  Serial.print("Player ");
  Serial.print(data->player_id);
  Serial.println(" pressed!");

  // Press the corresponding Key
  if (data->player_id == 1) Keyboard.write('1');
  if (data->player_id == 2) Keyboard.write('2');
  if (data->player_id == 3) Keyboard.write('3');
  if (data->player_id == 4) Keyboard.write('4');
  if (data->player_id == 5) Keyboard.write('5');
}

void setup() {
  Serial.begin(115200);
  
  // Start USB Keyboard
  Keyboard.begin();
  USB.begin();
  
  // Start WiFi (Required for ESP-NOW)
  WiFi.mode(WIFI_STA);
  
  // Wait a moment for USB to catch up, then print MAC
  delay(2000);
  Serial.println("--------------------------------------");
  Serial.print("HUB MAC ADDRESS: ");
  Serial.println(WiFi.macAddress());
  Serial.println("COPY THIS ADDRESS INTO YOUR BUTTON CODE!");
  Serial.println("--------------------------------------");

  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }
  
  // Register callback function
  esp_now_register_recv_cb(OnDataRecv);
}

void loop() {
  // Nothing to do here. Everything happens in OnDataRecv.
}