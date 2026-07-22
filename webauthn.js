export async function runWebAuthnFlow() {
  if (!window.PublicKeyCredential) {
    return {
      supported: false,
      message: 'WebAuthn is not available in this browser, so the flow reports that the platform authenticator is unavailable.',
    };
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return {
      supported: true,
      message: available
        ? 'Platform authenticator support was detected. The browser can use WebAuthn / Windows Hello capabilities.'
        : 'WebAuthn is supported by the browser, but no platform authenticator was detected in this environment.',
    };
  } catch (error) {
    return {
      supported: false,
      message: 'WebAuthn support could not be checked in this environment.',
    };
  }
}
