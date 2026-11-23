#!/usr/bin/env python3
"""
DrawAnything — Windows OS bridge.

A tiny localhost WebSocket server (ws://127.0.0.1:8765) that executes the
allowlisted OS actions the browser cannot do itself:
  - real keystrokes (single letters, SPACE, ENTER, BACKSPACE)
  - WASD key down/up holds (for games)
  - Windows master volume + mute (pycaw)

Run it on the laptop before a session:
    pip install -r requirements.txt
    python drawanything_bridge.py

Safety: binds to 127.0.0.1 only, and every message is checked against the
same allowlist as the web app. Anything else is refused and logged.
On non-Windows machines it runs in dry-run mode (logs actions, executes
nothing) so the protocol can be tested anywhere.
"""

import asyncio
import json
import sys

HOST = "127.0.0.1"
PORT = 8765

IS_WINDOWS = sys.platform.startswith("win")

# ---------------------------------------------------------------- OS actions
_volume = None  # cached IAudioEndpointVolume (panel rule: init once at boot)

if IS_WINDOWS:
    import ctypes

    user32 = ctypes.windll.user32

    class KEYBDINPUT(ctypes.Structure):
        _fields_ = [
            ("wVk", ctypes.c_ushort),
            ("wScan", ctypes.c_ushort),
            ("dwFlags", ctypes.c_ulong),
            ("time", ctypes.c_ulong),
            ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
        ]

    class INPUT_UNION(ctypes.Union):
        _fields_ = [("ki", KEYBDINPUT)]

    class INPUT(ctypes.Structure):
        _fields_ = [("type", ctypes.c_ulong), ("u", INPUT_UNION)]

    VK = {
        "SPACE": 0x20,
        "ENTER": 0x0D,
        "BACK": 0x08,
        "W": 0x57,
        "A": 0x41,
        "S": 0x53,
        "D": 0x44,
    }
    for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789":
        VK[ch] = ord(ch)

    def send_key(vk: int, up: bool = False) -> None:
        inp = INPUT()
        inp.type = 1  # INPUT_KEYBOARD
        inp.u.ki.wVk = vk
        inp.u.ki.dwFlags = 0x0002 if up else 0  # KEYEVENTF_KEYUP
        user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(inp))

    try:
        from ctypes import POINTER, cast
        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        _volume = cast(interface, POINTER(IAudioEndpointVolume))
        print("[bridge] pycaw volume endpoint ready")
    except Exception as exc:  # pragma: no cover - depends on the machine
        print(f"[bridge] pycaw unavailable ({exc}); volume/mute disabled")
else:
    print("[bridge] non-Windows OS: dry-run mode (actions are logged, not executed)")


def do_key(key: str) -> None:
    if IS_WINDOWS and key in VK:
        send_key(VK[key], up=False)
        send_key(VK[key], up=True)
    print(f"[bridge] key {key}")


def do_keydown(key: str) -> None:
    if IS_WINDOWS and key in VK:
        send_key(VK[key], up=False)
    print(f"[bridge] keydown {key}")


def do_keyup(key: str) -> None:
    if IS_WINDOWS and key in VK:
        send_key(VK[key], up=True)
    print(f"[bridge] keyup {key}")


def do_vol(v: float) -> None:
    v = max(0.0, min(1.0, float(v)))
    if IS_WINDOWS and _volume is not None:
        _volume.SetMasterVolumeLevelScalar(v, None)
    print(f"[bridge] vol {v:.2f}")


def do_mute() -> None:
    if IS_WINDOWS and _volume is not None:
        current = _volume.GetMute()
        _volume.SetMute(0 if current else 1, None)
    print("[bridge] mute toggle")


# ------------------------------------------------------------------ protocol
ALLOWED_KEYS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") | {"SPACE", "ENTER", "BACK"}
ALLOWED_HOLDS = {"W", "A", "S", "D"}


def handle(msg: dict) -> bool:
    t = msg.get("t")
    if t == "key" and msg.get("key") in ALLOWED_KEYS:
        do_key(msg["key"])
        return True
    if t == "keydown" and msg.get("key") in ALLOWED_HOLDS:
        do_keydown(msg["key"])
        return True
    if t == "keyup" and msg.get("key") in ALLOWED_HOLDS:
        do_keyup(msg["key"])
        return True
    if t == "vol" and isinstance(msg.get("v"), (int, float)):
        do_vol(msg["v"])
        return True
    if t == "mute":
        do_mute()
        return True
    print(f"[bridge] REFUSED {msg!r}")
    return False


async def on_client(ws):
    print("[bridge] client connected")
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except (ValueError, TypeError):
                continue
            if isinstance(msg, dict):
                handle(msg)
    except Exception as exc:
        print(f"[bridge] client error: {exc}")
    finally:
        print("[bridge] client disconnected")


async def main():
    import websockets

    async with websockets.serve(on_client, HOST, PORT):
        print(f"[bridge] DrawAnything OS bridge listening on ws://{HOST}:{PORT}")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[bridge] bye")
