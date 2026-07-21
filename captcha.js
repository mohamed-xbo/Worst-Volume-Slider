const DEFAULT_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZaeI';
const DEFAULT_VERIFY_URL = 'https://your-worker-subdomain.workers.dev/verify-captcha';

function loadRecaptchaScript() {
  return new Promise((resolve) => {
    if (window.grecaptcha) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src*="recaptcha/api.js"]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

async function postTokenForVerification(token) {
  const verifyUrl = window.__RECAPTCHA_VERIFY_URL__ || DEFAULT_VERIFY_URL;
  try {
    const resp = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!resp.ok) return { ok: false, error: 'network' };
    return await resp.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function initializeCaptchaFlow({ container, statusElement }) {
  statusElement.textContent = 'Preparing a real captcha widget when available…';

  try {
    await loadRecaptchaScript();
  } catch (error) {
    statusElement.textContent = 'reCAPTCHA was not available, so the demo continues in a transparent local mode.';
    return true;
  }

  if (!window.grecaptcha || !window.grecaptcha.render) {
    statusElement.textContent = 'reCAPTCHA script loaded but widget rendering is unavailable in this context.';
    return true;
  }

  const configuredKey = window.__RECAPTCHA_SITE_KEY__ || DEFAULT_SITE_KEY;

  return new Promise((resolve) => {
    const widgetId = window.grecaptcha.render(container, {
      sitekey: configuredKey,
      theme: 'light',
      callback: async (token) => {
        statusElement.textContent = 'Captcha completed — verifying...';
        const result = await postTokenForVerification(token);
        if (result && (result.success === true || result.score !== undefined)) {
          statusElement.textContent = 'Captcha verified.';
          resolve(true);
        } else if (result && result.success === false) {
          statusElement.textContent = 'Captcha verification failed.';
          resolve(false);
        } else {
          statusElement.textContent = 'Captcha verification returned unexpected result; proceeding.';
          resolve(true);
        }
      },
      'expired-callback': () => {
        statusElement.textContent = 'Captcha expired. Please retry.';
        resolve(false);
      },
      'error-callback': () => {
        statusElement.textContent = 'Captcha encountered an error. Continuing in demo mode.';
        resolve(true);
      },
    });

    if (widgetId === undefined) {
      statusElement.textContent = 'The widget could not be initialized; proceeding in demo mode.';
      resolve(true);
    }
  });
}
