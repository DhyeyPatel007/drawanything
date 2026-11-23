// Local Windows OS bridge client — ws://127.0.0.1:8765.
// The bridge (bridge/drawanything_bridge.py) executes allowlisted OS actions:
// real keystrokes, WASD holds, master volume, mute. If it is not running, the
// app still works fully in-browser (drums, synth, on-page typing) and OS
// actions are simply skipped.

export type BridgeMsg =
  | { t: "key"; key: string }
  | { t: "keydown"; key: string }
  | { t: "keyup"; key: string }
  | { t: "vol"; v: number }
  | { t: "mute" };

class Bridge {
  private ws: WebSocket | null = null;
  private timer: number | null = null;
  connected = false;
  onStatus: ((ok: boolean) => void) | null = null;

  start() {
    if (this.timer !== null) return;
    const tryConnect = () => {
      try {
        const ws = new WebSocket("ws://127.0.0.1:8765");
        ws.onopen = () => {
          this.ws = ws;
          this.connected = true;
          this.onStatus?.(true);
        };
        ws.onclose = () => {
          if (this.ws === ws) this.ws = null;
          if (this.connected) {
            this.connected = false;
            this.onStatus?.(false);
          }
        };
        ws.onerror = () => {
          try { ws.close(); } catch { /* noop */ }
        };
      } catch { /* bridge not running */ }
    };
    tryConnect();
    this.timer = window.setInterval(tryConnect, 3000);
  }

  send(msg: BridgeMsg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
        return true;
      } catch { /* fall through */ }
    }
    return false;
  }
}

export const bridge = new Bridge();
