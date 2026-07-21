import { animateProgress, rippleButton, animateRollback } from './animations.js';
import { initializeCaptchaFlow } from './captcha.js';
import { requestEmailVerification } from './email.js';
import { collectTelemetry, renderTelemetry } from './security.js';
import { runWebAuthnFlow } from './webauthn.js';

const state = {
  volume: 50,
  previousVolume: 50,
  locked: false,
  currentStep: 0,
  emailCode: null,
  codeExpiresAt: null,
  activeDialog: null,
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

function initialize() {
  renderVolume();
  bindEvents();
  populateTelemetry();
  updateStep(0);
}

function bindEvents() {
  slider.addEventListener('input', () => {
    state.volume = Number(slider.value);
    volumeValue.textContent = state.volume;
    statusPill.textContent = 'Pending review';
  });

  slider.addEventListener('pointerup', () => {
    if (state.locked) return;
    void beginVerificationFlow();
  });

  slider.addEventListener('touchend', () => {
    if (state.locked) return;
    void beginVerificationFlow();
  });

  document.addEventListener('click', handleDialogAction);
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
  progressLabel.textContent = text;
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
  if (state.locked) return;
  state.locked = true;
  slider.disabled = true;
  state.previousVolume = Number(slider.value);
  slider.dataset.previousValue = String(state.previousVolume);
  setStatus('Preparing secure authorization workflow…');
  await animateProgress(progressFill, 15);
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
    const emailInput = document.getElementById('email-input');
    if (!emailInput.value.trim()) {
      document.getElementById('email-status').textContent = 'Please enter a valid email address.';
      return;
    }

    const verification = await requestEmailVerification({ email: emailInput.value.trim() });
    state.emailCode = verification.code;
    state.codeExpiresAt = verification.expiresAt;
    document.getElementById('email-status').textContent = verification.message;

    if (verification.success) {
      hideDialog();
      await continueAfterEmailStep();
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

  if (action === 'webauthn-next') {
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
  await animateProgress(progressFill, 28);

  updateStep(2);
  setStatus('Verifying security policies…');
  await animateProgress(progressFill, 44);

  updateStep(3);
  setStatus('Preparing secure audio environment…');
  await animateProgress(progressFill, 56);

  showDialog('captcha');
  const captchaPassed = await initializeCaptchaFlow({
    container: document.getElementById('captcha-container'),
    statusElement: document.getElementById('captcha-status'),
  });

  if (!captchaPassed) {
    cancelFlow();
    return;
  }

  hideDialog();
  updateStep(4);
  setStatus('Applying cryptographic signatures…');
  await animateProgress(progressFill, 72);

  showDialog('email');
}

async function continueAfterEmailStep() {
  updateStep(4);
  setStatus('Collecting one-time verification code…');
  await animateProgress(progressFill, 82);
  showDialog('otp');
  const otpStatus = document.getElementById('otp-status');
  otpStatus.textContent = `Use code ${state.emailCode} if you are testing locally.`;
}

async function continueAfterOtpStep() {
  updateStep(5);
  setStatus('Checking platform authenticators…');
  await animateProgress(progressFill, 90);
  showDialog('webauthn');

  const statusElement = document.getElementById('webauthn-status');
  const webAuthnResult = await runWebAuthnFlow();
  statusElement.textContent = webAuthnResult.message;
}

async function continueAfterWebAuthnStep() {
  updateStep(5);
  setStatus('Preparing final security confirmation…');
  await animateProgress(progressFill, 96);
  showDialog('final');
}

async function completeFlow() {
  updateStep(6);
  setStatus('Finalizing permission tokens…');
  await animateProgress(progressFill, 100);
  state.volume = Number(slider.value);
  statusPill.textContent = 'Approved';
  progressLabel.textContent = `Volume change to ${state.volume} is now approved. This harmless demo does not alter the system volume.`;
  hideDialog();
  slider.disabled = false;
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
  hideDialog();
  slider.value = String(state.previousVolume);
  renderVolume();
  slider.disabled = false;
  state.locked = false;
  updateStep(0);
  animateRollback(slider);
  setStatus('Request cancelled. The slider rolled back to the previous value.');
  statusPill.textContent = 'Cancelled';
}

async function populateTelemetry() {
  const telemetry = await collectTelemetry();
  renderTelemetry(document.getElementById('telemetry-grid'), telemetry);
}

initialize();
