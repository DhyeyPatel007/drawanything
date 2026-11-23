// Live VLM test — runs the REAL Vercel handlers (api/parse, api/parse-patch)
// against Token Factory with synthetic drawn images.
// Requires NEBIUS_API_KEY in env (the harness passes the connector surrogate).
// Run via tests/vlm-live.sh. Not part of `npm test` (needs network + key).

import { readFileSync } from "node:fs";
// @ts-expect-error plain handler modules
import parseHandler from "../api/parse.ts";
// @ts-expect-error plain handler modules
import patchHandler from "../api/parse-patch.ts";

function mockRes() {
  return {
    statusCode: 0,
    payload: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
  };
}

const input = JSON.parse(readFileSync("/tmp/vlm-test-input.json", "utf8"));

let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  console.log(`${cond ? "  ok " : "FAIL "} ${name} ${extra}`);
  if (!cond) fail++;
}

// ---- /api/parse
{
  const res = mockRes();
  await parseHandler(
    { method: "POST", body: { markedImage: input.marked, candidates: input.candidates } },
    res
  );
  const p = res.payload as { fallback?: boolean; bindings?: { i: number; k: string; l: string; a: string }[] };
  console.log("parse response:", JSON.stringify(p).slice(0, 600));
  check("parse did not fall back", !p.fallback);
  const by = new Map((p.bindings ?? []).map((b) => [b.i, b]));
  check("slider #1 -> os.vol", by.get(1)?.a === "os.vol", JSON.stringify(by.get(1)));
  check("kick #2 -> aud.kick", by.get(2)?.a === "aud.kick", JSON.stringify(by.get(2)));
  check("snare #3 -> aud.snare", by.get(3)?.a === "aud.snare", JSON.stringify(by.get(3)));
  check("dial #4 -> aud.filter", by.get(4)?.a === "aud.filter", JSON.stringify(by.get(4)));
  check("H #5 -> os.key.H", by.get(5)?.a === "os.key.H", JSON.stringify(by.get(5)));
  check("W #6 -> key or hold W", by.get(6)?.a === "os.key.W" || by.get(6)?.a === "os.hold.W", JSON.stringify(by.get(6)));
}

// ---- /api/parse-patch
{
  const res = mockRes();
  await patchHandler({ method: "POST", body: { image: input.patch } }, res);
  const p = res.payload as { fallback?: boolean; label?: string; kind?: string };
  console.log("patch response:", JSON.stringify(p));
  check("patch did not fall back", !p.fallback);
  check("patch reads MUTE", (p.label ?? "").includes("MUTE"), `label=${p.label}`);
}

console.log(fail ? `\n${fail} FAILED` : "\nall live VLM checks passed");
process.exit(fail ? 1 : 0);
