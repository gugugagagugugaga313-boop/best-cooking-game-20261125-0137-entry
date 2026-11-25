// Steam, sparkles and floating score text: the small feedback that
// makes chopping and plating feel answered at once.
export function createParticles() {
  const puffs = [];
  const texts = [];

  return {
    steam(x, y, n = 1) {
      for (let i = 0; i < n; i++) {
        puffs.push({
          x: x + (Math.random() - 0.5) * 30,
          y,
          vy: -22 - Math.random() * 18,
          life: 0.9 + Math.random() * 0.5,
          age: 0,
          size: 5 + Math.random() * 7,
        });
      }
    },
    sparkle(x, y, color = '#ffd76a') {
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        puffs.push({
          x, y,
          vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
          life: 0.5, age: 0, size: 3, color,
        });
      }
    },
    smoke(x, y) {
      for (let i = 0; i < 12; i++) {
        puffs.push({
          x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 10,
          vy: -30 - Math.random() * 20, life: 1.4, age: 0, size: 9, color: '#5a5148',
        });
      }
    },
    floatText(x, y, text, color = '#ffd76a') {
      texts.push({ x, y, text, color, age: 0, life: 1.3 });
    },
    tick(dt) {
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.age += dt;
        p.y += (p.vy || -20) * dt;
        if (p.vx) p.x += p.vx * dt;
        if (p.age >= p.life) puffs.splice(i, 1);
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.age += dt;
        t.y -= 34 * dt;
        if (t.age >= t.life) texts.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of puffs) {
        const a = 1 - p.age / p.life;
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = p.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + p.age * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (const t of texts) {
        const a = 1 - t.age / t.life;
        ctx.globalAlpha = a;
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#241a12';
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
  };
}
