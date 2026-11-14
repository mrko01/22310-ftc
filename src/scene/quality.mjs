// Bound actual GPU work rather than assuming that a high-DPI screen is fast.
export function sceneQuality({width, height, pixelRatio = 1, coarse = false, saveData = false}) {
  const budget = coarse || saveData ? 1100000 : 2400000;
  const area = Math.max(1, width * height);
  return {
    pixelRatio: Math.max(.65, Math.min(pixelRatio, coarse ? 1.75 : 2, Math.sqrt(budget / area))),
    frameInterval: 1000 / (coarse || saveData ? 30 : 60),
    shadowSize: coarse || saveData ? 1024 : 2048,
  };
}

export function shouldRender({visible, hidden, paused, now, activeUntil}) {
  return visible && !hidden && (!paused || now <= activeUntil);
}
