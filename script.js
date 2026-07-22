import { animateProgress, rippleButton, animateRollback } from './animations.js';
import { initializeCaptchaFlow } from './captcha.js';
import { requestEmailVerification } from './email.js';
import { collectTelemetry, renderTelemetry } from './security.js';
import { runWebAuthnFlow, isPasskeySupported } from './webauthn.js';

window.__EMAILJS_SERVICE_ID__ = 'service_ku90h7i';
window.__EMAILJS_TEMPLATE_ID__ = 'template_ls95jmv';
window.__EMAILJS_PUBLIC_KEY__ = 'jbymrDkHWz4i017eg';

if (window.emailjs) {
  window.emailjs.init(window.__EMAILJS_PUBLIC_KEY__);
}

const state = {
  volume: 50,
  previousVolume: 50,
  locked: false,
  currentStep: 0,
  emailCode: null,
  codeExpiresAt: null,
  activeDialog: null,
  emailSendPending: false,
  passkeyRequired: false,
};

const slider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const statusPill = document.getElementById('status-pill');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const stepItems = Array.from(document.querySelectorAll('.step-item'));
const dialogLayer = document.getElementById('dialog-layer');
const templates = {
  confirmation: document.getElementById('confirmation-template'),
  captcha: document.getElementById('captcha-template'),
  email: document.getElementById('email-template'),
  otp: document.getElementById('otp-template'),
  webauthn: document.getElementById('webauthn-template'),
  final: document.getElementById('final-template'),
};
const darkModeToggle = document.getElementById('dark-mode-toggle');
const windowsModeToggle = document.getElementById('windows-mode-toggle');

function initialize() {
  renderVolume();
  bindEvents();
  populateTelemetry();
  syncSettingsFromStorage();
  updateStep(0);
}

function bindEvents() {
  slider.addEventListener('input', () => {
    state.volume = Number(slider.value);
    volumeValue.textContent = state.volume;
    statusPill.textContent = 'Pending review';
  });

  slider.addEventListener('change', () => {
    state.volume = Number(slider.value);
    volumeValue.textContent = state.volume;
    showAdminPrompt();
  });

  slider.addEventListener('pointerdown', () => {
    if (!state.locked) {
      state.previousVolume = Number(slider.value);
      slider.dataset.previousValue = String(state.previousVolume);
    }
  });

  slider.addEventListener('keydown', () => {
    if (!state.locked) {
      state.previousVolume = Number(slider.value);
      slider.dataset.previousValue = String(state.previousVolume);
    }
  });

  slider.addEventListener('mousedown', () => {
    if (!state.locked) {
      state.previousVolume = Number(slider.value);
      slider.dataset.previousValue = String(state.previousVolume);
    }
  });

  slider.addEventListener('touchstart', () => {
    if (!state.locked) {
      state.previousVolume = Number(slider.value);
      slider.dataset.previousValue = String(state.previousVolume);
    }
  });

  slider.addEventListener('pointerup', () => {
    state.volume = Number(slider.value);
    volumeValue.textContent = state.volume;
    showAdminPrompt();
  });

  slider.addEventListener('touchend', () => {
    state.volume = Number(slider.value);
    volumeValue.textContent = state.volume;
    showAdminPrompt();
  });

  document.addEventListener('click', handleDialogAction);

  darkModeToggle?.addEventListener('change', (event) => {
    const isDark = event.target.checked;
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.body.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('volume-slider-theme', isDark ? 'dark' : 'light');
  });

  windowsModeToggle?.addEventListener('change', (event) => {
    const isWindowsMode = event.target.checked;
    document.body.classList.toggle('windows-mode', isWindowsMode);
    localStorage.setItem('volume-slider-windows-mode', isWindowsMode ? 'true' : 'false');
  });
}

function renderVolume() {
  volumeValue.textContent = slider.value;
}

function updateStep(index) {
  state.currentStep = index;
  stepItems.forEach((item, itemIndex) => {
    item.classList.toggle('active', itemIndex === index);
  });
}

function setStatus(text) {
  if (progressLabel) {
    progressLabel.textContent = text;
  }
}

function showAdminPrompt() {
  if (state.locked) return;
  state.locked = true;
  setStatus('Preparing secure authorization workflow…');
  void beginVerificationFlow();
}

function showDialog(templateName) {
  const template = templates[templateName];
  if (!template) return;
  const fragment = template.content.firstElementChild.cloneNode(true);
  dialogLayer.innerHTML = '';
  dialogLayer.appendChild(fragment);
  dialogLayer.classList.add('visible');
  state.activeDialog = templateName;
}

function hideDialog() {
  dialogLayer.classList.remove('visible');
  dialogLayer.innerHTML = '';
  state.activeDialog = null;
}

async function beginVerificationFlow() {
  if (progressFill) {
    await animateProgress(progressFill, 15);
  }
  showDialog('confirmation');
}

async function handleDialogAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  rippleButton(button);

  if (action === 'confirm') {
    hideDialog();
    await runSecuritySequence();
    return;
  }

  if (action === 'cancel') {
    hideDialog();
    cancelFlow();
    return;
  }

  if (action === 'captcha-next') {
    hideDialog();
    await runSecuritySequence();
    return;
  }

  if (action === 'email-send') {
    if (state.emailSendPending) return;

    const emailInput = document.getElementById('email-input');
    const sendButton = button;
    const emailValue = emailInput.value.trim();
    if (!emailValue || !emailValue.includes('@gmail.com')) {
      document.getElementById('email-status').textContent = 'Only Gmail addresses are accepted.';
      return;
    }

    state.emailSendPending = true;
    sendButton.disabled = true;
    try {
      const verification = await requestEmailVerification({ email: emailValue });
      state.emailCode = verification.code;
      state.codeExpiresAt = verification.expiresAt;
      document.getElementById('email-status').textContent = verification.message;

      if (verification.success) {
        hideDialog();
        await continueAfterEmailStep();
      }
    } finally {
      state.emailSendPending = false;
      sendButton.disabled = false;
    }

    return;
  }

  if (action === 'otp-verify') {
    const otpInput = document.getElementById('otp-input');
    const enteredCode = otpInput.value.trim();
    const expected = String(state.emailCode ?? '');

    if (enteredCode === expected) {
      document.getElementById('otp-status').textContent = 'Code accepted.';
      hideDialog();
      await continueAfterOtpStep();
      return;
    }

    document.getElementById('otp-status').textContent = 'The entered code does not match the sample verification value.';
    return;
  }

  if (action === 'webauthn-retry') {
    await triggerWebAuthnFlow();
    return;
  }

  if (action === 'webauthn-next') {
    if (state.passkeyRequired && !state.webAuthnVerified) {
      const status = document.getElementById('webauthn-status');
      if (status) {
        status.textContent = 'Please complete the passkey prompt before continuing.';
      }
      return;
    }

    hideDialog();
    await continueAfterWebAuthnStep();
    return;
  }

  if (action === 'final-confirm') {
    hideDialog();
    await completeFlow();
    return;
  }
}

async function runSecuritySequence() {
  updateStep(1);
  setStatus('Checking browser integrity…');
  if (progressFill) {
    await animateProgress(progressFill, 28);
  }

  updateStep(2);
  setStatus('Verifying security policies…');
  if (progressFill) {
    await animateProgress(progressFill, 44);
  }

  updateStep(3);
  setStatus('Preparing secure audio environment…');
  if (progressFill) {
    await animateProgress(progressFill, 56);
  }

  showDialog('captcha');
  const captchaContinue = document.querySelector('button[data-action="captcha-next"]');
  if (captchaContinue) {
    captchaContinue.disabled = true;
  }

  const captchaPassed = await initializeCaptchaFlow({
    container: document.getElementById('captcha-container'),
    statusElement: document.getElementById('captcha-status'),
  });

  if (captchaContinue) {
    captchaContinue.disabled = false;
  }

  if (!captchaPassed) {
    cancelFlow();
    return;
  }

  hideDialog();
  updateStep(4);
  setStatus('Applying cryptographic signatures…');
  if (progressFill) {
    await animateProgress(progressFill, 72);
  }

  showDialog('email');
}

async function continueAfterEmailStep() {
  updateStep(4);
  setStatus('Collecting one-time verification code…');
  if (progressFill) {
    await animateProgress(progressFill, 82);
  }
  showDialog('otp');
  const otpStatus = document.getElementById('otp-status');
  otpStatus.innerHTML = 'Enter the code sent to your email to continue.<br><span class="otp-expiry">! CODE EXPIRES IN 10 MINUTES !</span>';
}

async function continueAfterOtpStep() {
  updateStep(5);
  setStatus('Checking platform authenticators…');
  if (progressFill) {
    await animateProgress(progressFill, 90);
  }

  const passkeySupported = await isPasskeySupported();
  if (!passkeySupported) {
    setStatus('Platform authenticator support is unavailable. Continuing without passkey.');
    await continueAfterWebAuthnStep();
    return;
  }

  state.passkeyRequired = true;
  state.webAuthnVerified = false;
  showDialog('webauthn');
  await triggerWebAuthnFlow();
}

async function triggerWebAuthnFlow() {
  const statusElement = document.getElementById('webauthn-status');
  const continueButton = document.querySelector('button[data-action="webauthn-next"]');
  const retryButton = document.querySelector('button[data-action="webauthn-retry"]');

  if (continueButton) continueButton.disabled = true;
  if (retryButton) retryButton.disabled = true;

  const webAuthnResult = await runWebAuthnFlow();
  if (statusElement) {
    statusElement.textContent = webAuthnResult.message;
  }

  if (webAuthnResult.supported) {
    state.webAuthnVerified = true;
    if (continueButton) continueButton.disabled = false;
    if (retryButton) retryButton.disabled = false;
  } else {
    state.webAuthnVerified = false;
    if (continueButton) continueButton.disabled = true;
    if (retryButton) retryButton.disabled = false;
  }
}

async function continueAfterWebAuthnStep() {
  updateStep(5);
  setStatus('Preparing final security confirmation…');
  if (progressFill) {
    await animateProgress(progressFill, 96);
  }
  showDialog('final');
}


async function completeFlow() {
  updateStep(6);
  setStatus('Finalizing permission tokens…');
  if (progressFill) {
    await animateProgress(progressFill, 100);
  }
  state.volume = Number(slider.value);
  statusPill.textContent = 'Approved';
  if (progressLabel) {
    progressLabel.textContent = `Volume change to ${state.volume} is now approved. This harmless flow does not alter the system volume.`;
  }
  hideDialog();
  state.locked = false;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Volume request approved', {
      body: 'The harmless verification flow completed successfully.',
    });
  }

  try {
    await navigator.clipboard.writeText(`Volume ${state.volume}`);
  } catch {
    // Clipboard access is optional for the demo.
  }
}

function cancelFlow() {
  state.volume = state.previousVolume;
  slider.value = String(state.previousVolume);
  renderVolume();
  state.locked = false;
  state.emailSendPending = false;
  state.passkeyRequired = false;
  state.webAuthnVerified = false;
  animateRollback(slider);
  setStatus('Request cancelled. The slider rolled back to the previous value.');
  statusPill.textContent = 'Cancelled';
}

function syncSettingsFromStorage() {
  const savedTheme = localStorage.getItem('volume-slider-theme') || 'light';
  const isDarkMode = savedTheme === 'dark';
  document.documentElement.dataset.theme = savedTheme;
  document.body.dataset.theme = savedTheme;
  darkModeToggle.checked = isDarkMode;

  const savedWindowsMode = localStorage.getItem('volume-slider-windows-mode') || 'false';
  const isWindowsMode = savedWindowsMode === 'true';
  document.body.classList.toggle('windows-mode', isWindowsMode);
  windowsModeToggle.checked = isWindowsMode;
}

async function populateTelemetry() {
  const telemetryGrid = document.getElementById('telemetry-grid');
  if (!telemetryGrid) return;

  const telemetry = await collectTelemetry();
  renderTelemetry(telemetryGrid, telemetry);
}

initialize();
