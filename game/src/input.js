// Keyboard + mouse input for Solmar Heat.
// WASD / arrows move, E is the interact key, mouse aims, click / Space / F shoots.
export function createInput(canvas) {
  const pressed = new Set();
  const input = {
    keys: pressed,
    mouseX: 640,
    mouseY: 360,
    mouseHeld: false,
    shootFlag: false,
    actionFlag: false,
    aimAngle: 0,
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    const key = event.key.toLowerCase();
    pressed.add(key);
    if (event.key === ' ' || key === 'f') input.shootFlag = true;
    if (key === 'e') input.actionFlag = true;
  });
  window.addEventListener('keyup', (event) => pressed.delete(event.key.toLowerCase()));

  canvas.addEventListener('mousemove', (event) => {
    const box = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - box.left;
    input.mouseY = event.clientY - box.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouseHeld = true;
      input.shootFlag = true;
    }
  });
  window.addEventListener('mouseup', () => { input.mouseHeld = false; });

  input.axis = () => {
    let x = 0;
    let y = 0;
    if (pressed.has('a') || pressed.has('arrowleft')) x -= 1;
    if (pressed.has('d') || pressed.has('arrowright')) x += 1;
    if (pressed.has('w') || pressed.has('arrowup')) y -= 1;
    if (pressed.has('s') || pressed.has('arrowdown')) y += 1;
    return { x, y };
  };

  // Consume the one-shot flags; holding the mouse keeps firing.
  input.takeShoot = () => {
    const fired = input.shootFlag || input.mouseHeld;
    input.shootFlag = false;
    return fired;
  };
  input.takeAction = () => {
    const acted = input.actionFlag;
    input.actionFlag = false;
    return acted;
  };
  return input;
}
