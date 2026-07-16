/**
 * useLudoSounds.js — every sound effect the spec asks for (dice roll, dice
 * land, piece move/select, capture, victory, button click), synthesized
 * live with the Web Audio API instead of shipping external audio files.
 * Nothing here is a recording or sample — it's plain oscillators/noise, so
 * there's no asset licensing to deal with and no extra bundle weight.
 *
 * Usage: const sfx = useLudoSounds(); sfx.diceLand();
 * Pass `enabled={false}` to mute everything (e.g. a future settings toggle).
 */
import { useCallback, useRef } from 'react';

export default function useLudoSounds(enabled = true) {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!enabled) return null;
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) ctxRef.current = new AC();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [enabled]);

  const tone = useCallback((freq, duration, opts = {}) => {
    const { type = 'sine', gain = 0.18, delay = 0, glideTo } = opts;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    const t0 = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }, [getCtx]);

  const noiseBurst = useCallback((duration, opts = {}) => {
    const { gain = 0.12, delay = 0 } = opts;
    const ctx = getCtx();
    if (!ctx) return;
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime + delay);
    src.connect(g).connect(ctx.destination);
    src.start(ctx.currentTime + delay);
  }, [getCtx]);

  const diceRoll = useCallback(() => {
    // A short cluster of clicky ticks, mimics a tumbling cube.
    for (let i = 0; i < 6; i++) noiseBurst(0.05, { gain: 0.05, delay: i * 0.09 });
  }, [noiseBurst]);

  const diceLand = useCallback(() => {
    tone(180, 0.12, { type: 'triangle', gain: 0.22, glideTo: 90 });
    noiseBurst(0.08, { gain: 0.1, delay: 0.02 });
  }, [tone, noiseBurst]);

  const pieceSelect = useCallback(() => tone(660, 0.08, { gain: 0.14 }), [tone]);
  const pieceMove   = useCallback(() => tone(420, 0.06, { type: 'square', gain: 0.08 }), [tone]);
  const capture     = useCallback(() => tone(500, 0.15, { type: 'sawtooth', gain: 0.18, glideTo: 120 }), [tone]);
  const click       = useCallback(() => tone(300, 0.05, { gain: 0.1 }), [tone]);

  const victory = useCallback(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, 0.35, { type: 'triangle', gain: 0.16, delay: i * 0.12 })
    );
  }, [tone]);

  return { diceRoll, diceLand, pieceSelect, pieceMove, capture, victory, click };
}
