import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_DESK_STATE,
  applyInkKeystroke,
  bottleCapAngleToCutoffHz,
  clampVolume,
  classifyFingerGesture,
  isSheetCalibrated,
  moveGameRover,
  recordPadHit,
  setVolumeState,
  toggleCalibrationCorner,
  toggleMuteState,
  volumeToGain,
} from './deskState';

test('volume clamping and perceptual gain curve respect mute', () => {
  assert.equal(clampVolume(-20), 0);
  assert.equal(clampVolume(140), 100);
  assert.equal(clampVolume(50.4), 50);
  assert.equal(volumeToGain(80, true), 0);
  assert.equal(volumeToGain(100, false), 1);
  assert.ok(volumeToGain(50, false) > 0.3 && volumeToGain(50, false) < 0.4);
});

test('toggleMuteState stops active groove and toggles mute cleanly', () => {
  const playing = { ...INITIAL_DESK_STATE, groovePlaying: true, muted: false };
  const muted = toggleMuteState(playing);
  assert.equal(muted.muted, true);
  assert.equal(muted.groovePlaying, false);

  const unmuted = toggleMuteState(muted);
  assert.equal(unmuted.muted, false);
});

test('setVolumeState unmutes when raising volume from muted and mutes at 0', () => {
  const muted = { ...INITIAL_DESK_STATE, muted: true, volume: 0 };
  const raised = setVolumeState(muted, 65);
  assert.equal(raised.volume, 65);
  assert.equal(raised.muted, false);

  const zeroed = setVolumeState(raised, 0);
  assert.equal(zeroed.volume, 0);
  assert.equal(zeroed.muted, true);
});

test('recordPadHit increments per-pad count and tracks lastHit', () => {
  const afterKick = recordPadHit(INITIAL_DESK_STATE, 'kick');
  const afterSnare = recordPadHit(afterKick, 'snare');
  const afterKick2 = recordPadHit(afterSnare, 'kick');
  assert.equal(afterKick2.hitCounts.kick, 2);
  assert.equal(afterKick2.hitCounts.snare, 1);
  assert.equal(afterKick2.lastHit, 'kick');
});

test('bottleCapAngleToCutoffHz sweeps monotonically from 180Hz to 4200Hz', () => {
  assert.equal(bottleCapAngleToCutoffHz(-135), 180);
  assert.equal(bottleCapAngleToCutoffHz(135), 4200);
  const mid = bottleCapAngleToCutoffHz(0);
  assert.ok(mid > 700 && mid < 1000);
});

test('applyInkKeystroke appends characters, space, and handles backspace', () => {
  let text = applyInkKeystroke('', 'D');
  text = applyInkKeystroke(text, 'R');
  text = applyInkKeystroke(text, 'SPACE');
  text = applyInkKeystroke(text, 'A');
  assert.equal(text, 'DR A');
  text = applyInkKeystroke(text, 'BACKSPACE');
  assert.equal(text, 'DR ');
});

test('moveGameRover stays strictly inside grid boundaries', () => {
  assert.deepEqual(moveGameRover({ x: 0, y: 0 }, 'W', 5), { x: 0, y: 0 });
  assert.deepEqual(moveGameRover({ x: 0, y: 0 }, 'A', 5), { x: 0, y: 0 });
  assert.deepEqual(moveGameRover({ x: 2, y: 2 }, 'D', 5), { x: 3, y: 2 });
  assert.deepEqual(moveGameRover({ x: 4, y: 4 }, 'S', 5), { x: 4, y: 4 });
});

test('classifyFingerGesture distinguishes real tap from drifting hover', () => {
  const realTap = classifyFingerGesture([
    { speed: 18, occlusion: 0.05 },
    { speed: 22, occlusion: 0.25 },
    { speed: 0.4, occlusion: 0.85 },
    { speed: 0.1, occlusion: 0.9 },
  ]);
  assert.equal(realTap, 'tap');

  const driftingHover = classifyFingerGesture([
    { speed: 6, occlusion: 0.1 },
    { speed: 7.5, occlusion: 0.55 },
    { speed: 6.2, occlusion: 0.6 },
    { speed: 5.5, occlusion: 0.2 },
  ]);
  assert.equal(driftingHover, 'hover');
});

test('4-corner sheet calibration locks only when all four corners are marked', () => {
  let corners = toggleCalibrationCorner([], 'tl');
  corners = toggleCalibrationCorner(corners, 'tr');
  corners = toggleCalibrationCorner(corners, 'br');
  assert.equal(isSheetCalibrated(corners), false);
  corners = toggleCalibrationCorner(corners, 'bl');
  assert.equal(isSheetCalibrated(corners), true);
});
