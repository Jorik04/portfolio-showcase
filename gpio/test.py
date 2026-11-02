import hmac
import os
import signal

from flask import Flask, request, jsonify
from gpiozero import LED


app = Flask(__name__)

GPIO_SERVICE_TOKEN = os.environ.get("GPIO_SERVICE_TOKEN")

if not GPIO_SERVICE_TOKEN:
    raise RuntimeError("GPIO_SERVICE_TOKEN is missing")

GPIO_PINS = [5, 6, 16, 17, 22, 23, 24, 25, 26, 27]

leds = {
    str(pin): LED(pin)
    for pin in GPIO_PINS
}

def authorized():
    provided = request.headers.get("X-GPIO-Token", "")

    return hmac.compare_digest(
        provided,
        GPIO_SERVICE_TOKEN,
    )

@app.get("/health")
def health():
    return jsonify({"ok": True})

@app.get("/gpio")
def get_gpio_state():
    if not authorized():
        return jsonify({"error": "Unauthorized"}), 401
    
    return jsonify({
        name: led.is_lit
        for name, led in leds.items()
    })

@app.post("/gpio")
def set_gpio_state():
    if not authorized():
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", ""))
    requested_state = data.get("on")

    if name not in leds:
        return jsonify({"error": "Unknown LED"}), 400
    
    if not isinstance(requested_state, bool):
        return jsonify({"error": "'on' must be true or false"}), 400
    
    led = leds[name]

    if requested_state:
        led.on()
    else: 
        led.off()

    return jsonify({
        "ok": True,
        "name": name,
        "on": led.is_lit,
    })

def cleanup(_signal_number=None, _frame=None):
    for led in leds.values():
        led.off()
        led.close()

    raise SystemExit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False,
    )