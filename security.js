function formatMemory(value) {
  if (typeof value !== 'number') return 'Unavailable';
  return `${value.toFixed(0)} GB`;
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
}

export async function collectTelemetry() {
  const battery = navigator.getBattery ? await navigator.getBattery().catch(() => null) : null;
  const memory = navigator.deviceMemory || null;
  const hardwareConcurrency = navigator.hardwareConcurrency || null;
  const language = navigator.language || 'Unknown';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
  const connection = navigator.connection || null;
  const isOnline = navigator.onLine;
  const isFullscreen = !!document.fullscreenElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const pointerType = window.matchMedia('(pointer: coarse)').matches ? 'Coarse' : 'Fine';
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return [
    { label: 'Browser', value: getBrowserName() },
    { label: 'Connection', value: connection?.effectiveType || (isOnline ? 'Online' : 'Offline') },
    { label: 'Language', value: language },
    { label: 'Timezone', value: timezone },
    { label: 'Battery', value: battery ? `${Math.round(battery.level * 100)}%` : 'Unavailable' },
    { label: 'Memory', value: formatMemory(memory) },
    { label: 'Threads', value: hardwareConcurrency ? `${hardwareConcurrency}` : 'Unavailable' },
    { label: 'Theme', value: prefersDark ? 'Dark' : 'Light' },
    { label: 'Pointer', value: pointerType },
    { label: 'Touch', value: touchSupport ? 'Supported' : 'Not supported' },
    { label: 'Fullscreen', value: isFullscreen ? 'Active' : 'Inactive' },
  ];
}

export function renderTelemetry(container, telemetry) {
  container.innerHTML = telemetry
    .map(
      (item) => `
        <div class="telemetry-card">
          <strong>${item.label}</strong>
          <span>${item.value}</span>
        </div>
      `
    )
    .join('');
}

export async function runWebAuthnFlow() {
  if (!window.PublicKeyCredential) {
    return {
      supported: false,
      message: 'WebAuthn is not available in this browser.',
    };
  }

  return {
    supported: true,
    message: 'WebAuthn is supported. This demo uses the API only to surface the capability.',
  };
}
