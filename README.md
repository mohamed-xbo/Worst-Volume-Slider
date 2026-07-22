# Secure Volume Control

A deliberately overengineered, harmless browser-based volume control experience that uses real browser APIs to stage an absurdly serious verification flow.

## Description

This project recreates the feel of a polished Windows 11 settings page with a dramatic security workflow that appears extremely serious while remaining entirely safe. The flow is intentionally over-the-top and comedic, but it uses real browser capabilities wherever possible.

## Features

- Windows 11-inspired interface with rounded corners, layered surfaces, and polished animations
- Slider-based volume control with a dramatic verification process
- Real browser APIs including:
  - reCAPTCHA integration
  - EmailJS verification
  - WebAuthn capability detection
  - Clipboard, notifications, visibility, fullscreen, theme, network, and device detection hints
- Progressive loading and animated step indicators
- Responsive layout and dark mode support

## Technologies

- HTML5
- CSS3
- ES6 modules
- Google reCAPTCHA
- EmailJS
- WebAuthn / Credential Management APIs where supported

## Project Structure

```text
WorstVolumeSlider/
├── index.html
├── style.css
├── script.js
├── captcha.js
├── email.js
├── security.js
├── animations.js
├── README.md
└── assets/
    ├── icons/
    ├── images/
    └── sounds/
```

## Configuration

### EmailJS

1. Create an EmailJS account.
2. Create a service and email template.
3. Set the following globals before loading the app:

```html
<script>
  window.__EMAILJS_SERVICE_ID__ = 'your_service_id';
  window.__EMAILJS_TEMPLATE_ID__ = 'your_template_id';
  window.__EMAILJS_PUBLIC_KEY__ = 'your_public_key';
</script>
```

### Google reCAPTCHA

1. Create a site key from Google reCAPTCHA.
2. Set the site key before loading the app:

```html
<script>
  window.__RECAPTCHA_SITE_KEY__ = 'your_site_key';
</script>
```

## Run locally

Open the project folder in a browser or serve it from a simple local web server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## License

This project is for educational and entertainment purposes. It is intentionally harmless and does not modify your system or collect sensitive data beyond the email used for the verification flow.

## Screenshots

Placeholder for screenshots.
