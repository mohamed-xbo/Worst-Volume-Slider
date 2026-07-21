const DEFAULT_SERVICE_ID = '';
const DEFAULT_TEMPLATE_ID = '';
const DEFAULT_PUBLIC_KEY = '';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestEmailVerification({ email }) {
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  const serviceId = window.__EMAILJS_SERVICE_ID__ || DEFAULT_SERVICE_ID;
  const templateId = window.__EMAILJS_TEMPLATE_ID__ || DEFAULT_TEMPLATE_ID;
  const publicKey = window.__EMAILJS_PUBLIC_KEY__ || DEFAULT_PUBLIC_KEY;

  if (window.emailjs && serviceId && templateId && publicKey) {
    try {
      emailjs.init(publicKey);
      await window.emailjs.send(serviceId, templateId, {
        to_email: email,
        verify_code: code,
      });
      return {
        success: true,
        code,
        expiresAt,
        message: 'A real EmailJS request was sent. The code is shown locally for the demo.',
      };
    } catch (error) {
      return {
        success: false,
        code,
        expiresAt,
        message: 'EmailJS could not be reached, so the demo uses a local fallback code.',
      };
    }
  }

  return {
    success: true,
    code,
    expiresAt,
    message: 'EmailJS is not configured in this local demo, so a harmless fallback code is shown in-browser.',
  };
}
