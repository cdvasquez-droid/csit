/* ---------- Galaxy canvas ---------- */
const canvas = document.getElementById("galaxy");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let W, H, stars = [], shooting = [];
const mouse = { x: 0, y: 0 };            // -0.5 .. 0.5 from screen centre
const cam = { x: 0, y: 0, vx: 0, vy: 0 }; // camera offset from dragging
const COLORS = ["#f1eeff", "#bfb2ff", "#5ce1ff", "#ffb3f0"];

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.round((W * H) / 5500);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: Math.random() * 0.9 + 0.1,          // depth: small = far away
    r: Math.random() * 1.4 + 0.3,
    tw: Math.random() * Math.PI * 2,
    c: COLORS[Math.floor(Math.random() * COLORS.length)]
  }));
}
window.addEventListener("resize", resize);
resize();

window.addEventListener("pointermove", e => {
  mouse.x = e.clientX / W - 0.5;
  mouse.y = e.clientY / H - 0.5;
});

/* Drag the empty background to fly through the stars */
let flying = false, last = { x: 0, y: 0 };
canvas.addEventListener("pointerdown", e => {
  flying = true;
  last = { x: e.clientX, y: e.clientY };
  canvas.classList.add("flying");
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", e => {
  if (!flying) return;
  cam.vx = e.clientX - last.x;
  cam.vy = e.clientY - last.y;
  cam.x += cam.vx;
  cam.y += cam.vy;
  last = { x: e.clientX, y: e.clientY };
});
const stopFly = () => { flying = false; canvas.classList.remove("flying"); };
canvas.addEventListener("pointerup", stopFly);
canvas.addEventListener("pointercancel", stopFly);

function wrap(v, max) { return ((v % max) + max) % max; }

function spawnShootingStar() {
  shooting.push({
    x: Math.random() * W * 0.8,
    y: Math.random() * H * 0.4,
    vx: 8 + Math.random() * 6,
    vy: 3 + Math.random() * 3,
    life: 1
  });
}

function frame(t) {
  ctx.clearRect(0, 0, W, H);

  // Momentum after letting go of a drag
  if (!flying) {
    cam.x += cam.vx;
    cam.y += cam.vy;
    cam.vx *= 0.95;
    cam.vy *= 0.95;
  }

  for (const s of stars) {
    const px = wrap(s.x + cam.x * s.z - mouse.x * 60 * s.z, W);
    const py = wrap(s.y + cam.y * s.z - mouse.y * 60 * s.z, H);
    const twinkle = reduceMotion ? 1 : 0.65 + 0.35 * Math.sin(t / 700 + s.tw);
    ctx.globalAlpha = s.z * twinkle;
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(px, py, s.r * (0.6 + s.z), 0, Math.PI * 2);
    ctx.fill();
  }

  if (!reduceMotion) {
    if (Math.random() < 0.004) spawnShootingStar();
    for (let i = shooting.length - 1; i >= 0; i--) {
      const m = shooting[i];
      ctx.globalAlpha = m.life;
      ctx.strokeStyle = "#cfe9ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 6, m.y - m.vy * 6);
      ctx.stroke();
      m.x += m.vx; m.y += m.vy; m.life -= 0.02;
      if (m.life <= 0) shooting.splice(i, 1);
    }
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- Draggable cards, chips and orbs ---------- */
const draggables = document.querySelectorAll("[data-drag]");
let topZ = 50;

draggables.forEach(el => {
  let startX, startY, baseX = 0, baseY = 0, active = false;

  el.addEventListener("pointerdown", e => {
    if (e.target.closest("a")) return;        // links stay clickable
    active = true;
    startX = e.clientX;
    startY = e.clientY;
    el.classList.add("dragging");
    el.style.position = el.style.position || "relative";
    el.style.zIndex = ++topZ;
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", e => {
    if (!active) return;
    const dx = baseX + e.clientX - startX;
    const dy = baseY + e.clientY - startY;
    el.style.transform = `translate(${dx}px, ${dy}px) rotate(${(e.clientX - startX) * 0.01}deg)`;
    el.dataset.x = dx;
    el.dataset.y = dy;
  });

  const drop = () => {
    if (!active) return;
    active = false;
    baseX = parseFloat(el.dataset.x || 0);
    baseY = parseFloat(el.dataset.y || 0);
    el.classList.remove("dragging");
    el.style.transform = `translate(${baseX}px, ${baseY}px)`;
  };
  el.addEventListener("pointerup", drop);
  el.addEventListener("pointercancel", drop);

  el.resetPosition = () => {
    baseX = baseY = 0;
    el.dataset.x = el.dataset.y = 0;
    el.style.transition = "transform 0.5s ease";
    el.style.transform = "translate(0, 0)";
    setTimeout(() => { el.style.transition = ""; }, 520);
  };
});

document.getElementById("reset").addEventListener("click", () => {
  draggables.forEach(el => el.resetPosition());
  cam.x = cam.y = cam.vx = cam.vy = 0;
});

/* ---------- Typing effect ---------- */
const words = ["websites.", "interactive experiences.", "clean code.", "things for the web."];
const typed = document.getElementById("typed");
let w = 0, c = 0, deleting = false;

function type() {
  const word = words[w];
  typed.textContent = word.slice(0, c);
  if (!deleting && c === word.length) { deleting = true; return setTimeout(type, 1400); }
  if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; }
  c += deleting ? -1 : 1;
  setTimeout(type, deleting ? 40 : 90);
}
if (reduceMotion) typed.textContent = words[0]; else type();
