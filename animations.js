export function rippleButton(button) {
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${button.clientWidth / 2}px`;
  ripple.style.top = `${button.clientHeight / 2}px`;
  button.appendChild(ripple);
  requestAnimationFrame(() => {
    ripple.style.transform = 'scale(3)';
    ripple.style.opacity = '0';
  });
  setTimeout(() => ripple.remove(), 400);
}

export async function animateProgress(progressBar, target) {
  if (!progressBar || !progressBar.style) return;

  const start = Number(progressBar.style.width.replace('%', '')) || 0;
  const distance = target - start;
  const steps = 12;
  for (let i = 1; i <= steps; i += 1) {
    progressBar.style.width = `${start + (distance * i) / steps}%`;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

export function animateRollback(slider) {
  const from = Number(slider.value);
  const to = Number(slider.dataset.previousValue || from);
  const easing = (t) => t * t * (3 - 2 * t);
  const startTime = performance.now();
  const duration = 400;

  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const value = from + (to - from) * easing(progress);
    slider.value = String(Math.round(value));
    document.getElementById('volume-value').textContent = Math.round(value);
    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}
