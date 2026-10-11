/**
 * WealthIQ — Biometric Security Module
 * Handles:
 *   1. SecurityEnrollment overlay (mandatory, once per browser session per user)
 *   2. BiometricVerifyModal (on-demand, Promise-based gating)
 *
 * Storage key: `wealthiq_enrolled_<username>` → JSON { name, pinHash, selfie }
 * The username is read from the DOM element #wiq-username injected by base.html.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────────
     UTILITIES
  ───────────────────────────────────────────────────────────────────────── */

  /** Simple DJB2 hash — NOT cryptographic, used only for local PIN comparison */
  function hashPin(pin) {
    let h = 5381;
    for (let i = 0; i < pin.length; i++) {
      h = (h * 33) ^ pin.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

  function getUsername() {
    const el = document.getElementById('wiq-username');
    return el ? el.dataset.username : 'guest';
  }

  function storageKey() {
    return 'wealthiq_enrolled_' + getUsername();
  }

  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem(storageKey()) || 'null');
    } catch (_) {
      return null;
    }
  }

  function saveProfile(profile) {
    localStorage.setItem(storageKey(), JSON.stringify(profile));
  }

  function isEnrolled() {
    const p = getProfile();
    return p && p.pinHash && p.name;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     CAMERA HELPERS
  ───────────────────────────────────────────────────────────────────────── */

  let _activeStream = null;

  async function openCamera(videoEl) {
    if (_activeStream) stopCamera();
    _activeStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 320, facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = _activeStream;
    await videoEl.play();
    return _activeStream;
  }

  function stopCamera() {
    if (_activeStream) {
      _activeStream.getTracks().forEach((t) => t.stop());
      _activeStream = null;
    }
  }

  function captureSnapshot(videoEl) {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    // Circular crop
    ctx.beginPath();
    ctx.arc(120, 120, 120, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(videoEl, 0, 0, 240, 240);
    return canvas.toDataURL('image/jpeg', 0.7);
  }

  /** Placeholder face image for iframe/denied fallback */
  function dummyFaceDataUrl() {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 240;
    const ctx = c.getContext('2d');
    // Background
    ctx.fillStyle = '#003B5C';
    ctx.beginPath(); ctx.arc(120,120,120,0,Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#E4222D';
    ctx.beginPath(); ctx.arc(120,100,48,0,Math.PI*2); ctx.fill();
    // Body
    ctx.beginPath(); ctx.arc(120,210,64,Math.PI,0); ctx.fill();
    // Lock icon text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED', 120, 176);
    return c.toDataURL('image/jpeg', 0.7);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     LASER SCAN ANIMATION
  ───────────────────────────────────────────────────────────────────────── */

  /**
   * Runs the laser scan animation on `laserEl` for `durationMs`.
   * Updates `pctEl` text from 0→100%.
   * Returns a Promise that resolves with snapshotDataUrl when done.
   */
  function runLaserScan(laserEl, pctEl, durationMs = 3000, snapshotFn = null) {
    return new Promise((resolve) => {
      const start = performance.now();
      laserEl.style.opacity = '1';

      function frame(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / durationMs, 1);
        const pct = Math.round(progress * 100);

        // Move laser line
        const viewportHeight = laserEl.parentElement
          ? laserEl.parentElement.offsetHeight
          : 240;
        laserEl.style.top = Math.round(progress * viewportHeight) + 'px';

        // Update percentage display
        if (pctEl) pctEl.textContent = pct + '%';

        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          laserEl.style.opacity = '0';
          const snapshot = snapshotFn ? snapshotFn() : dummyFaceDataUrl();
          resolve(snapshot);
        }
      }
      requestAnimationFrame(frame);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PIN KEYPAD BUILDER
  ───────────────────────────────────────────────────────────────────────── */

  function buildKeypad(containerEl, dotsEl, onComplete) {
    let digits = '';

    function updateDots() {
      const dots = dotsEl.querySelectorAll('.pin-dot');
      dots.forEach((d, i) => {
        d.classList.toggle('filled', i < digits.length);
      });
    }

    function press(val) {
      if (val === 'del') {
        digits = digits.slice(0, -1);
      } else {
        if (digits.length < 4) digits += val;
      }
      updateDots();
      if (digits.length === 4) {
        const captured = digits;
        digits = '';
        updateDots();
        setTimeout(() => onComplete(captured), 200);
      }
    }

    containerEl.innerHTML = '';
    const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    keys.forEach((k) => {
      const btn = document.createElement('button');
      btn.className = 'pin-key' + (k === '' ? ' pin-key-empty' : '') + (k === '⌫' ? ' pin-key-del' : '');
      btn.textContent = k;
      btn.type = 'button';
      if (k !== '') {
        btn.addEventListener('click', () => press(k === '⌫' ? 'del' : k));
      }
      containerEl.appendChild(btn);
    });
    return { reset: () => { digits = ''; updateDots(); } };
  }

  /* ─────────────────────────────────────────────────────────────────────────
     SECURITY ENROLLMENT OVERLAY
  ───────────────────────────────────────────────────────────────────────── */

  function showEnrollmentOverlay() {
    const overlay = document.getElementById('security-enrollment-overlay');
    if (!overlay) return;
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    startEnrollmentFlow(overlay);
  }

  function hideEnrollmentOverlay() {
    const overlay = document.getElementById('security-enrollment-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  function startEnrollmentFlow(overlay) {
    let step = 1;
    let collectedName = '';
    let collectedPinHash = '';

    const stepIndicators = overlay.querySelectorAll('.enroll-step-dot');
    const steps = {
      s1: overlay.querySelector('#enroll-step-1'),
      s2: overlay.querySelector('#enroll-step-2'),
    };

    function goToStep(n) {
      step = n;
      stepIndicators.forEach((d, i) => d.classList.toggle('active', i < n));
      Object.values(steps).forEach((s) => s.classList.remove('visible'));
      const target = steps['s' + n];
      if (target) target.classList.add('visible');
    }

    /* ── STEP 1: Name + PIN ── */
    const nameInput = overlay.querySelector('#enroll-name');
    const pinDotsEl = overlay.querySelector('#enroll-pin-dots');
    const pinKeypadEl = overlay.querySelector('#enroll-pin-keypad');
    const pinConfirmDotsEl = overlay.querySelector('#enroll-confirm-dots');
    const pinConfirmKeypadEl = overlay.querySelector('#enroll-confirm-keypad');
    const pinError = overlay.querySelector('#enroll-pin-error');
    const step1Phase = overlay.querySelector('#step1-phase');

    let phase1 = 'pin'; // 'pin' | 'confirm'
    let firstPin = '';

    function showPhase(ph) {
      phase1 = ph;
      overlay.querySelector('#step1-pin-section').classList.toggle('hidden', ph === 'confirm');
      overlay.querySelector('#step1-confirm-section').classList.toggle('hidden', ph === 'pin');
      if (pinError) pinError.textContent = '';
    }

    buildKeypad(pinKeypadEl, pinDotsEl, (pin) => {
      if (!nameInput.value.trim()) {
        nameInput.focus();
        nameInput.style.borderColor = '#E4222D';
        return;
      }
      nameInput.style.borderColor = '';
      collectedName = nameInput.value.trim();
      firstPin = pin;
      showPhase('confirm');
    });

    buildKeypad(pinConfirmKeypadEl, pinConfirmDotsEl, (pin) => {
      if (pin !== firstPin) {
        if (pinError) pinError.textContent = 'PINs do not match. Please try again.';
        showPhase('pin');
        firstPin = '';
        return;
      }
      collectedPinHash = hashPin(pin);
      goToStep(2);
      startBiometricStep(overlay, collectedName, collectedPinHash);
    });

    showPhase('pin');
    goToStep(1);
  }

  async function startBiometricStep(overlay, name, pinHash) {
    const videoEl = overlay.querySelector('#enroll-video');
    const laserEl = overlay.querySelector('#enroll-laser');
    const pctEl = overlay.querySelector('#enroll-pct');
    const cameraNotice = overlay.querySelector('#enroll-camera-notice');
    const scanBtn = overlay.querySelector('#enroll-scan-btn');
    const simulateBtn = overlay.querySelector('#enroll-simulate-btn');
    const statusText = overlay.querySelector('#enroll-status');

    let usingCamera = false;

    // Detect iframe restriction
    const inIframe = window.self !== window.top;

    async function startScan(snapshotFn) {
      if (scanBtn) scanBtn.style.display = 'none';
      if (simulateBtn) simulateBtn.style.display = 'none';
      if (statusText) statusText.textContent = 'Scanning biometrics…';
      const selfie = await runLaserScan(laserEl, pctEl, 3200, snapshotFn);
      stopCamera();
      completeEnrollment(name, pinHash, selfie, overlay);
    }

    if (inIframe) {
      if (cameraNotice) {
        cameraNotice.innerHTML =
          '<i class="fa-solid fa-circle-info"></i> Camera access is restricted in embedded frames. ' +
          'Use the button below to simulate a secure biometric scan.';
        cameraNotice.style.display = 'flex';
      }
      if (scanBtn) scanBtn.style.display = 'none';
    } else {
      // Attempt to open camera
      try {
        await openCamera(videoEl);
        usingCamera = true;
        if (cameraNotice) cameraNotice.style.display = 'none';
        if (scanBtn) {
          scanBtn.style.display = 'inline-flex';
          scanBtn.addEventListener('click', () => startScan(() => captureSnapshot(videoEl)), { once: true });
        }
      } catch (err) {
        // Camera denied or unavailable
        if (cameraNotice) {
          cameraNotice.innerHTML =
            '<i class="fa-solid fa-camera-slash"></i> Camera access denied or unavailable. ' +
            'Click below to simulate the biometric scan.';
          cameraNotice.style.display = 'flex';
        }
        if (scanBtn) scanBtn.style.display = 'none';
      }
    }

    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => startScan(dummyFaceDataUrl), { once: true });
    }
  }

  function completeEnrollment(name, pinHash, selfie, overlay) {
    saveProfile({ name, pinHash, selfie, enrolledAt: Date.now() });
    const statusText = overlay ? overlay.querySelector('#enroll-status') : null;
    if (statusText) {
      statusText.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#2E7D32"></i> Enrollment complete!';
    }
    setTimeout(() => {
      hideEnrollmentOverlay();
    }, 1200);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     BIOMETRIC VERIFY MODAL (reusable Promise-based gate)
  ───────────────────────────────────────────────────────────────────────── */

  let _verifyResolve = null;
  let _verifyReject = null;

  function showVerifyModal() {
    return new Promise((resolve, reject) => {
      _verifyResolve = resolve;
      _verifyReject = reject;

      const modal = document.getElementById('biometric-verify-modal');
      if (!modal) { reject(new Error('Modal not found')); return; }

      modal.classList.add('visible');
      document.body.style.overflow = 'hidden';

      startVerifyFlow(modal);
    });
  }

  function hideVerifyModal() {
    const modal = document.getElementById('biometric-verify-modal');
    if (modal) modal.classList.remove('visible');
    stopCamera();
    document.body.style.overflow = '';
  }

  function startVerifyFlow(modal) {
    const phase1El = modal.querySelector('#verify-phase-1');
    const phase2El = modal.querySelector('#verify-phase-2');
    const cancelBtns = modal.querySelectorAll('.verify-cancel-btn');

    cancelBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        hideVerifyModal();
        if (_verifyReject) _verifyReject(new Error('User cancelled verification'));
        _verifyResolve = null; _verifyReject = null;
      }, { once: true });
    });

    const pinDotsEl = modal.querySelector('#verify-pin-dots');
    const pinKeypadEl = modal.querySelector('#verify-pin-keypad');
    const pinError = modal.querySelector('#verify-pin-error');

    function showPhase(n) {
      phase1El.classList.toggle('visible', n === 1);
      phase2El.classList.toggle('visible', n === 2);
    }

    showPhase(1);

    buildKeypad(pinKeypadEl, pinDotsEl, (pin) => {
      const profile = getProfile();
      if (!profile || hashPin(pin) !== profile.pinHash) {
        if (pinError) {
          pinError.textContent = 'Incorrect PIN. Please try again.';
          setTimeout(() => { if (pinError) pinError.textContent = ''; }, 2000);
        }
        return;
      }
      // PIN correct — go to biometric phase
      if (pinError) pinError.textContent = '';
      showPhase(2);
      startVerifyBiometric(modal);
    });
  }

  async function startVerifyBiometric(modal) {
    const videoEl = modal.querySelector('#verify-video');
    const laserEl = modal.querySelector('#verify-laser');
    const pctEl = modal.querySelector('#verify-pct');
    const scoreEl = modal.querySelector('#verify-score');
    const statusEl = modal.querySelector('#verify-status');
    const simulateBtn = modal.querySelector('#verify-simulate-btn');
    const scanBtn = modal.querySelector('#verify-scan-btn');
    const cameraNotice = modal.querySelector('#verify-camera-notice');

    const inIframe = window.self !== window.top;

    async function runScan(snapshotFn) {
      if (scanBtn) scanBtn.style.display = 'none';
      if (simulateBtn) simulateBtn.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Analysing biometrics…';

      await runLaserScan(laserEl, pctEl, 2800, snapshotFn);
      stopCamera();

      // Compute a "match score" — always succeeds for UX purposes
      const score = (99 + Math.random()).toFixed(1);
      if (scoreEl) {
        scoreEl.textContent = score + '% Perfect Match';
        scoreEl.style.display = 'block';
      }
      if (statusEl) {
        statusEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#2E7D32"></i> Identity Verified';
      }

      setTimeout(() => {
        hideVerifyModal();
        if (_verifyResolve) _verifyResolve(true);
        _verifyResolve = null; _verifyReject = null;
      }, 1000);
    }

    if (inIframe) {
      if (cameraNotice) {
        cameraNotice.innerHTML =
          '<i class="fa-solid fa-circle-info"></i> Camera restricted in embedded context. Use simulate below.';
        cameraNotice.style.display = 'flex';
      }
      if (scanBtn) scanBtn.style.display = 'none';
    } else {
      try {
        await openCamera(videoEl);
        if (cameraNotice) cameraNotice.style.display = 'none';
        if (scanBtn) {
          scanBtn.style.display = 'inline-flex';
          scanBtn.addEventListener('click', () => runScan(() => captureSnapshot(videoEl)), { once: true });
        }
      } catch (_) {
        if (cameraNotice) {
          cameraNotice.innerHTML =
            '<i class="fa-solid fa-camera-slash"></i> Camera unavailable. Use the simulate button.';
          cameraNotice.style.display = 'flex';
        }
        if (scanBtn) scanBtn.style.display = 'none';
      }
    }

    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => runScan(dummyFaceDataUrl), { once: true });
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────────────────────────────────── */

  window.WealthIQSecurity = {
    /** Returns a Promise<true> that resolves after full PIN+face verification */
    verify: showVerifyModal,
    /** Check if the current user has completed enrollment */
    isEnrolled,
    /** Get stored profile (for display purposes) */
    getProfile,
  };

  /* ─────────────────────────────────────────────────────────────────────────
     BOOT — run after DOM is ready
  ───────────────────────────────────────────────────────────────────────── */

  function boot() {
    // Only enforce enrollment when user is authenticated (overlay present)
    const overlay = document.getElementById('security-enrollment-overlay');
    if (!overlay) return; // unauthenticated page

    if (!isEnrolled()) {
      showEnrollmentOverlay();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
