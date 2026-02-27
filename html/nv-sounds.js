/* ═══════════════════════════════════════════════════════════════
   NeViS · nv-sounds.js  v3  — Unified Web Audio Engine
   ─────────────────────────────────────────────────────────────
   Fully synthesized — ZERO audio files required.

   Global: window.NVS
   ─────────────────────────────────────────────────────────────
   Mode (localStorage 'nv_mode'):
     'normal'  → music enabled, NO forced button sounds
     'ramadan' → music muted, button clicks + download chimes

   Always-on sounds (both modes):
     NVS.translate()   — language toggle button
     NVS.theme()       — dark/light mode button

   Ramadan-only sounds (auto-wired via NVS.init()):
     NVS.click()       — any button/link press
     NVS.download()    — external links / download links

   Welcome page:
     NVS.modeRamadan() — selected Ramadan (ascending Maqam)
     NVS.modeNormal()  — selected Normal (bright fanfare)
═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Audio context (lazy, one per page) ── */
  let _ctx = null;
  function ac() {
    if (!_ctx) {
      try { _ctx = new (global.AudioContext || global.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  /* ── Primitive: shaped oscillator note ──
     freq   – Hz
     amp    – peak gain (0-1)
     type   – OscillatorType
     offset – seconds from now to start
     dur    – duration in seconds                            */
  function note(freq, amp, type, offset, dur) {
    const c = ac(); if (!c) return;
    try {
      const t   = c.currentTime;
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.connect(g); g.connect(c.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t + offset);
      g.gain.setValueAtTime(0, t + offset);
      g.gain.linearRampToValueAtTime(amp,    t + offset + 0.007);
      g.gain.exponentialRampToValueAtTime(0.0001, t + offset + dur);
      osc.start(t + offset);
      osc.stop(t  + offset + dur + 0.04);
    } catch (e) {}
  }

  /* ── Primitive: frequency sweep (portamento) ── */
  function sweep(f1, f2, amp, type, offset, dur) {
    const c = ac(); if (!c) return;
    try {
      const t   = c.currentTime;
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.connect(g); g.connect(c.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(f1, t + offset);
      osc.frequency.exponentialRampToValueAtTime(f2, t + offset + dur * 0.75);
      g.gain.setValueAtTime(0, t + offset);
      g.gain.linearRampToValueAtTime(amp,    t + offset + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + offset + dur);
      osc.start(t + offset);
      osc.stop(t  + offset + dur + 0.04);
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════
     NAMED SOUNDS
  ══════════════════════════════════════════════ */

  /* Theme toggle — warm rising chime (2 notes) */
  function _theme() {
    note(528, 0.13, 'sine',     0,    0.22);
    note(792, 0.09, 'sine',     0.10, 0.20);
    note(1056,0.06, 'triangle', 0.20, 0.22);
  }

  /* Translate toggle — quick double blip with pitch glide */
  function _translate() {
    sweep(660, 880,  0.11, 'sine', 0,    0.14);
    sweep(880, 1100, 0.07, 'sine', 0.10, 0.12);
  }

  /* Button click — soft tap (Ramadan) */
  function _click() {
    note(1200, 0.07, 'square', 0,    0.04);
    note(600,  0.04, 'sine',   0.02, 0.07);
  }

  /* Download / external nav chime — ascending 4-note (Ramadan) */
  function _download() {
    note(523,  0.11, 'sine', 0,    0.20);
    note(659,  0.09, 'sine', 0.11, 0.17);
    note(784,  0.07, 'sine', 0.22, 0.20);
    note(1046, 0.05, 'sine', 0.34, 0.28);
  }

  /* Mode select: Ramadan — ascending Maqam Rast–inspired phrase */
  function _modeRamadan() {
    const scale = [264, 297, 330, 352, 396, 440, 495, 528];
    scale.forEach((f, i) => {
      note(f, Math.max(0.04, 0.14 - i * 0.013), 'sine', i * 0.085, 0.38);
    });
  }

  /* Mode select: Normal — bright major fanfare */
  function _modeNormal() {
    note(523,  0.14, 'triangle', 0,    0.22);
    note(659,  0.11, 'triangle', 0.10, 0.20);
    note(784,  0.09, 'triangle', 0.20, 0.24);
    note(1046, 0.08, 'triangle', 0.30, 0.30);
    note(1318, 0.05, 'triangle', 0.40, 0.32);
  }

  /* ══════════════════════════════════════════════
     NVS PUBLIC API
  ══════════════════════════════════════════════ */
  const NVS = {

    /* ── State ── */
    get mode()     { return localStorage.getItem('nv_mode') || 'normal'; },
    isRamadan()    { return this.mode === 'ramadan'; },

    /* ── Always-on button sounds ── */
    theme()        { _theme(); },
    translate()    { _translate(); },

    /* ── Ramadan-only button sounds ── */
    click()        { if (this.isRamadan()) _click(); },
    download()     { if (this.isRamadan()) _download(); },

    /* ── Mode selection sounds (welcome page) ── */
    modeRamadan()  { _modeRamadan(); },
    modeNormal()   { _modeNormal(); },

    /* ── Mute / unmute all <audio> and <video> elements ── */
    muteAll(muted) {
      document.querySelectorAll('audio, video').forEach(el => {
        el.muted  = muted;
        el.volume = muted ? 0 : 1;
      });
    },

    /* ── Apply music mute based on saved mode ── */
    applyMode() {
      this.muteAll(this.isRamadan());
      /* Watch for audio/video added later */
      if (!this._obs) {
        this._obs = new MutationObserver(() => this.muteAll(this.isRamadan()));
        this._obs.observe(document.body, { childList: true, subtree: true });
      }
    },

    /* ── Wire ALL button/link clicks automatically ── */
    init() {
      if (this._wired) return;
      this._wired = true;

      this.applyMode();

      /* Translate button — always plays translate sound */
      document.addEventListener('click', e => {
        if (e.target.closest('.nv-lang-btn, #langBtn, .wl-nav-btn[data-sound="lang"]')) {
          _translate();
        }
      }, { capture: true, passive: true });

      /* Theme button — always plays theme sound */
      document.addEventListener('click', e => {
        if (e.target.closest('.nv-theme-btn, #themeBtn, .wl-nav-btn[data-sound="theme"]')) {
          _theme();
        }
      }, { capture: true, passive: true });

      /* Ramadan-only: ALL other buttons + links */
      document.addEventListener('click', e => {
        if (!this.isRamadan()) return;

        /* Skip translate / theme (already handled above) */
        const isLang  = e.target.closest('.nv-lang-btn, #langBtn');
        const isTheme = e.target.closest('.nv-theme-btn, #themeBtn');
        if (isLang || isTheme) return;

        /* External / download link → download chime */
        const link = e.target.closest('a[href]');
        if (link) {
          const href = link.href || '';
          const isExternal = link.target === '_blank' ||
            !!link.download ||
            (href && !href.startsWith(location.origin) &&
              !href.startsWith('#') && !href.startsWith('javascript'));
          if (isExternal) { _download(); return; }
        }

        /* Any button → click blip */
        const btn = e.target.closest('button, [role="button"], .nv-btn, .wl-cta, .wl-nav-btn, input[type="submit"]');
        if (btn) _click();

      }, { capture: true, passive: true });
    }

  };

  global.NVS = NVS;

})(window);
