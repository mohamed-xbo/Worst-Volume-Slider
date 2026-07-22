export async function isPasskeySupported() {
  if (!window.PublicKeyCredential || !window.isSecureContext) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function runWebAuthnFlow() {
  if (!window.PublicKeyCredential || !window.isSecureContext) {
    return {
      supported: false,
      message: 'Windows Hello is not available in this environment. A secure context is required.',
    };
  }

  const available = await isPasskeySupported();
  if (!available) {
    return {
      supported: false,
      message: 'Platform authenticator support is unavailable in this browser or environment.',
    };
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userId = new Uint8Array([1, 2, 3, 4]);

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Worst Volume Slider' },
        user: {
          id: userId,
          name: 'user@example.com',
          displayName: 'Verified User',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    if (!credential) {
      return {
        supported: false,
        message: 'Windows Hello prompt was shown, but no credential was created.',
      };
    }

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: new Uint8Array(credential.rawId),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!assertion) {
      return {
        supported: false,
        message: 'Windows Hello verification failed to return a valid credential.',
      };
    }

    return {
      supported: true,
      message: 'Windows Hello / platform authenticator completed successfully.',
    };
  } catch (error) {
    return {
      supported: false,
      message: `Windows Hello prompt failed: ${error?.message || error}`,
    };
  }
}
