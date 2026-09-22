const { createCanvas } = require('@napi-rs/canvas');
const { randomBytes }  = require('crypto');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function rand(n) { return Math.floor(Math.random() * n); }

function generateCode(len = 6) {
  const bytes = randomBytes(len);
  return Array.from({ length: len }, (_, i) => CHARS[bytes[i] % CHARS.length]).join('');
}

function generateCaptcha() {
  const code = generateCode(6);
  const W = 340, H = 110;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);

  // subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // noise dots
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(${rand(255)},${rand(255)},${rand(255)},${Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(rand(W), rand(H), Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // bezier noise lines
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(${rand(180) + 75},${rand(80)},${rand(80)},0.45)`;
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(rand(W), rand(H));
    ctx.bezierCurveTo(rand(W), rand(H), rand(W), rand(H), rand(W), rand(H));
    ctx.stroke();
  }

  // characters
  const palette = ['#ed4245', '#ff6b6b', '#ff9e9e', '#ffffff', '#d0d0e8', '#ffaa88'];
  const spacing = (W - 40) / code.length;
  for (let i = 0; i < code.length; i++) {
    ctx.save();
    ctx.translate(20 + i * spacing + spacing / 2, 60 + (Math.random() - 0.5) * 16);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.font        = `bold ${30 + rand(12)}px monospace`;
    ctx.fillStyle   = palette[i % palette.length];
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 5;
    ctx.fillText(code[i], 0, 0);
    ctx.restore();
  }

  return { code, buffer: canvas.toBuffer('image/png') };
}

function generateMath() {
  const ops = ['+', '-', '×'];
  const op  = ops[rand(ops.length)];
  let a, b, answer;

  if      (op === '+') { a = rand(60) + 10; b = rand(60) + 10; answer = a + b; }
  else if (op === '-') { a = rand(60) + 30; b = rand(a - 5) + 5; answer = a - b; }
  else                 { a = rand(11) + 2; b = rand(11) + 2; answer = a * b; }

  return { question: `${a} ${op} ${b}`, answer: answer.toString() };
}

module.exports = { generateCaptcha, generateMath };
