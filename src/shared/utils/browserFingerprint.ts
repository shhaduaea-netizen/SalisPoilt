const STORAGE_KEY = 'sp_browser_fingerprint';

function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    `${new Date().getTimezoneOffset()}`,
    navigator.hardwareConcurrency?.toString() ?? '',
    (navigator as unknown as { deviceMemory?: number }).deviceMemory?.toString() ?? '',
    navigator.platform ?? '',
  ];
  const raw = components.join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}_${raw.length.toString(36)}`;
}

export function getBrowserFingerprint(): string {
  try {
    let fp = sessionStorage.getItem(STORAGE_KEY);
    if (!fp) {
      fp = generateFingerprint();
      sessionStorage.setItem(STORAGE_KEY, fp);
    }
    return fp;
  } catch {
    return generateFingerprint();
  }
}
