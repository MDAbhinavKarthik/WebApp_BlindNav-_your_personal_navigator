/*
 * BlindNav+ ESP32-CAM Firmware
 * Streams video to the web application for processing
 * 
 * Hardware: ESP32-CAM (AI Thinker module)
 * 
 * Instructions:
 * 1. Install ESP32 board in Arduino IDE
 * 2. Select "AI Thinker ESP32-CAM" board
 * 3. Update WiFi credentials below
 * 4. Upload the sketch
 * 5. Check Serial Monitor for the IP address
 * 6. Enter the IP in the BlindNav+ web app
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ===========================================
// WiFi Configuration - UPDATE THESE
// ===========================================
const char* ssid = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";    // Your WiFi password

// ===========================================
// Camera Pin Configuration (AI Thinker)
// ===========================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// LED Flash pin
#define LED_GPIO_NUM       4

// ===========================================
// Server Configuration
// ===========================================
httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

// Streaming settings
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// ===========================================
// Stream Handler
// ===========================================
static esp_err_t stream_handler(httpd_req_t *req) {
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len = 0;
    uint8_t *_jpg_buf = NULL;
    char part_buf[64];
    
    // Set CORS headers for cross-origin access
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET");
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    
    res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
    if (res != ESP_OK) {
        return res;
    }
    
    Serial.println("Stream started");
    
    while (true) {
        fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Camera capture failed");
            res = ESP_FAIL;
        } else {
            if (fb->format != PIXFORMAT_JPEG) {
                bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
                esp_camera_fb_return(fb);
                fb = NULL;
                if (!jpeg_converted) {
                    Serial.println("JPEG compression failed");
                    res = ESP_FAIL;
                }
            } else {
                _jpg_buf_len = fb->len;
                _jpg_buf = fb->buf;
            }
        }
        
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
        }
        if (res == ESP_OK) {
            size_t hlen = snprintf(part_buf, 64, _STREAM_PART, _jpg_buf_len);
            res = httpd_resp_send_chunk(req, part_buf, hlen);
        }
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        }
        
        if (fb) {
            esp_camera_fb_return(fb);
            fb = NULL;
            _jpg_buf = NULL;
        } else if (_jpg_buf) {
            free(_jpg_buf);
            _jpg_buf = NULL;
        }
        
        if (res != ESP_OK) {
            Serial.println("Stream ended");
            break;
        }
        
        // Small delay to control frame rate (~15 fps)
        delay(66);
    }
    
    return res;
}

// ===========================================
// Capture Single Frame Handler
// ===========================================
static esp_err_t capture_handler(httpd_req_t *req) {
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;
    
    // Set CORS headers
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET");
    
    fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Camera capture failed");
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }
    
    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
    
    res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
    
    esp_camera_fb_return(fb);
    
    return res;
}

// ===========================================
// Status Handler
// ===========================================
static esp_err_t status_handler(httpd_req_t *req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_type(req, "application/json");
    
    char status[256];
    snprintf(status, sizeof(status), 
        "{\"status\":\"ok\",\"ip\":\"%s\",\"ssid\":\"%s\",\"rssi\":%d}",
        WiFi.localIP().toString().c_str(),
        WiFi.SSID().c_str(),
        WiFi.RSSI()
    );
    
    httpd_resp_send(req, status, strlen(status));
    return ESP_OK;
}

// ===========================================
// LED Control Handler
// ===========================================
static esp_err_t led_handler(httpd_req_t *req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    
    char buf[10];
    int ret = httpd_req_get_url_query_str(req, buf, sizeof(buf));
    
    if (ret == ESP_OK) {
        char param[10];
        if (httpd_query_key_value(buf, "state", param, sizeof(param)) == ESP_OK) {
            if (strcmp(param, "on") == 0) {
                digitalWrite(LED_GPIO_NUM, HIGH);
            } else {
                digitalWrite(LED_GPIO_NUM, LOW);
            }
        }
    }
    
    httpd_resp_send(req, "OK", 2);
    return ESP_OK;
}

// ===========================================
// Root Handler (Info Page)
// ===========================================
static esp_err_t index_handler(httpd_req_t *req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_type(req, "text/html");
    
    char html[1024];
    snprintf(html, sizeof(html),
        "<!DOCTYPE html><html><head><title>BlindNav+ ESP32-CAM</title>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<style>body{font-family:Arial;text-align:center;padding:20px;background:#1a1a2e;color:#fff;}"
        "h1{color:#4a90d9;}img{max-width:100%%;border-radius:8px;margin:20px 0;}"
        ".info{background:#0f3460;padding:15px;border-radius:8px;margin:10px;}</style></head>"
        "<body><h1>BlindNav+ ESP32-CAM</h1>"
        "<div class='info'><p><strong>Status:</strong> Online</p>"
        "<p><strong>IP Address:</strong> %s</p>"
        "<p><strong>WiFi:</strong> %s (RSSI: %d dBm)</p></div>"
        "<h3>Live Stream</h3><img src='http://%s:81/stream'>"
        "<p>Enter this IP in BlindNav+ app: <strong>%s</strong></p>"
        "</body></html>",
        WiFi.localIP().toString().c_str(),
        WiFi.SSID().c_str(),
        WiFi.RSSI(),
        WiFi.localIP().toString().c_str(),
        WiFi.localIP().toString().c_str()
    );
    
    httpd_resp_send(req, html, strlen(html));
    return ESP_OK;
}

// ===========================================
// Start Camera Server
// ===========================================
void startCameraServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;
    
    // Start main server on port 80
    httpd_uri_t index_uri = {
        .uri       = "/",
        .method    = HTTP_GET,
        .handler   = index_handler,
        .user_ctx  = NULL
    };
    
    httpd_uri_t capture_uri = {
        .uri       = "/capture",
        .method    = HTTP_GET,
        .handler   = capture_handler,
        .user_ctx  = NULL
    };
    
    httpd_uri_t status_uri = {
        .uri       = "/status",
        .method    = HTTP_GET,
        .handler   = status_handler,
        .user_ctx  = NULL
    };
    
    httpd_uri_t led_uri = {
        .uri       = "/led",
        .method    = HTTP_GET,
        .handler   = led_handler,
        .user_ctx  = NULL
    };
    
    Serial.println("Starting main server on port 80");
    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(camera_httpd, &index_uri);
        httpd_register_uri_handler(camera_httpd, &capture_uri);
        httpd_register_uri_handler(camera_httpd, &status_uri);
        httpd_register_uri_handler(camera_httpd, &led_uri);
    }
    
    // Start stream server on port 81
    config.server_port = 81;
    config.ctrl_port = 32769;
    
    httpd_uri_t stream_uri = {
        .uri       = "/stream",
        .method    = HTTP_GET,
        .handler   = stream_handler,
        .user_ctx  = NULL
    };
    
    Serial.println("Starting stream server on port 81");
    if (httpd_start(&stream_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(stream_httpd, &stream_uri);
    }
}

// ===========================================
// Setup
// ===========================================
void setup() {
    Serial.begin(115200);
    Serial.println();
    Serial.println("=================================");
    Serial.println("BlindNav+ ESP32-CAM Starting...");
    Serial.println("=================================");
    
    // Configure LED
    pinMode(LED_GPIO_NUM, OUTPUT);
    digitalWrite(LED_GPIO_NUM, LOW);
    
    // Camera configuration
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    
    // Frame settings - adjust based on available PSRAM
    if (psramFound()) {
        Serial.println("PSRAM found - using higher resolution");
        config.frame_size = FRAMESIZE_VGA;      // 640x480
        config.jpeg_quality = 12;               // 0-63, lower = better quality
        config.fb_count = 2;                    // Double buffering
    } else {
        Serial.println("No PSRAM - using lower resolution");
        config.frame_size = FRAMESIZE_CIF;      // 400x296
        config.jpeg_quality = 15;
        config.fb_count = 1;
    }
    
    // Initialize camera
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x\n", err);
        Serial.println("Restarting in 5 seconds...");
        delay(5000);
        ESP.restart();
        return;
    }
    
    Serial.println("Camera initialized successfully");
    
    // Adjust camera settings for better quality
    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 0);     // -2 to 2
        s->set_contrast(s, 0);       // -2 to 2
        s->set_saturation(s, 0);     // -2 to 2
        s->set_special_effect(s, 0); // 0 = No Effect
        s->set_whitebal(s, 1);       // Auto white balance
        s->set_awb_gain(s, 1);       // Auto white balance gain
        s->set_wb_mode(s, 0);        // 0 = Auto
        s->set_exposure_ctrl(s, 1);  // Auto exposure
        s->set_aec2(s, 1);           // Auto exposure control 2
        s->set_ae_level(s, 0);       // -2 to 2
        s->set_aec_value(s, 300);    // 0 to 1200
        s->set_gain_ctrl(s, 1);      // Auto gain
        s->set_agc_gain(s, 0);       // 0 to 30
        s->set_gainceiling(s, (gainceiling_t)6); // 0 to 6
        s->set_bpc(s, 0);            // Black pixel correction
        s->set_wpc(s, 1);            // White pixel correction
        s->set_raw_gma(s, 1);        // Gamma correction
        s->set_lenc(s, 1);           // Lens correction
        s->set_hmirror(s, 0);        // Horizontal mirror
        s->set_vflip(s, 0);          // Vertical flip
        s->set_dcw(s, 1);            // Downsize enable
        s->set_colorbar(s, 0);       // Test pattern off
    }
    
    // Connect to WiFi
    Serial.println();
    Serial.print("Connecting to WiFi: ");
    Serial.println(ssid);
    
    WiFi.begin(ssid, password);
    WiFi.setSleep(false);  // Disable WiFi sleep for better streaming
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\nWiFi connection failed!");
        Serial.println("Please check credentials and restart");
        // Blink LED to indicate error
        for (int i = 0; i < 10; i++) {
            digitalWrite(LED_GPIO_NUM, HIGH);
            delay(100);
            digitalWrite(LED_GPIO_NUM, LOW);
            delay(100);
        }
        return;
    }
    
    Serial.println();
    Serial.println("=================================");
    Serial.println("WiFi Connected Successfully!");
    Serial.println("=================================");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.println();
    Serial.println("Stream URL: http://" + WiFi.localIP().toString() + ":81/stream");
    Serial.println("Status URL: http://" + WiFi.localIP().toString() + "/status");
    Serial.println("Capture URL: http://" + WiFi.localIP().toString() + "/capture");
    Serial.println();
    Serial.println("Enter this IP in BlindNav+ app: " + WiFi.localIP().toString());
    Serial.println("=================================");
    
    // Flash LED to indicate successful connection
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_GPIO_NUM, HIGH);
        delay(200);
        digitalWrite(LED_GPIO_NUM, LOW);
        delay(200);
    }
    
    // Start web server
    startCameraServer();
    
    Serial.println("Camera server started!");
}

// ===========================================
// Main Loop
// ===========================================
void loop() {
    // Check WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected! Reconnecting...");
        WiFi.reconnect();
        delay(5000);
    }
    
    // Print status every 30 seconds
    static unsigned long lastStatus = 0;
    if (millis() - lastStatus > 30000) {
        Serial.printf("Status: IP=%s, RSSI=%d dBm, Free heap=%d bytes\n",
            WiFi.localIP().toString().c_str(),
            WiFi.RSSI(),
            ESP.getFreeHeap()
        );
        lastStatus = millis();
    }
    
    delay(100);
}
