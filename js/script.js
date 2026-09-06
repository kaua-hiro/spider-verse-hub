// ═══════════════════════════════════════
// TEIAS INTERATIVAS — malha orbicular (raios + anéis) com física de massa-mola
// por nó: presa no centro e na borda externa, livre nos anéis internos, então
// o toque do cursor afunda a teia localmente e a deformação se propaga pelos
// vizinhos como uma onda, balançando e assentando como seda de verdade.
// ═══════════════════════════════════════
(function cornerWebs() {
  const webEls = document.querySelectorAll(".corner-web");
  if (!webEls.length) return;
  // a teia sempre é desenhada; a física só não roda em telas sem cursor (touch),
  // onde não faz sentido — é um floreio decorativo pequeno, não uma automação
  // que dispara sozinha, então não trava atrás de "reduzir movimento"
  const animate = !matchMedia("(hover: none)").matches;

  const SVGNS = "http://www.w3.org/2000/svg";
  const SPOKE_ANGLES = [0, 16, 34, 56, 74, 90]; // graus a partir da borda superior — espaçamento levemente irregular, tecelagem à mão
  const RINGS = [0, 50, 88, 128, 180]; // raios; o 1º (centro) e o último (moldura) ficam presos

  // caminho suave passando pelos pontos — usado só nos anéis (a espiral de
  // captura arqueia entre os raios); os raios continuam retos, porque fios
  // radiais de uma teia real ficam esticados/tensos, não curvos
  function smoothPath(pts) {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const end = i === pts.length - 2 ? p1 : { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      d += ` Q ${p0.x.toFixed(2)},${p0.y.toFixed(2)} ${end.x.toFixed(2)},${end.y.toFixed(2)}`;
    }
    return d;
  }

  const MAX_DIST = 480; // alcance de influência do cursor, em unidades do viewBox
  const MAX_PULL = 30;
  const COUPLING = 0.38; // quanto o deslocamento de um nó contagia seus vizinhos
  const STIFFNESS = 0.16;
  const DAMPING = 0.72;
  const WIND_AMP = 9; // vento constante — a teia balança sozinha, sem depender do cursor
  const WIND_SPEED = 0.5;
  const GUST_SPEED = 0.18; // variação lenta da força do vento, pra não parecer um metrônomo

  let mouseX = -9999;
  let mouseY = -9999;

  const webs = Array.from(webEls).map((el) => {
    const isRight = el.classList.contains("corner-web--tr");
    const anchor = isRight ? { x: 200, y: 0 } : { x: 0, y: 0 };
    const bySpokeRing = SPOKE_ANGLES.map((angDeg, si) => {
      const rad = (angDeg * Math.PI) / 180;
      const dir = { x: (isRight ? -1 : 1) * Math.cos(rad), y: Math.sin(rad) };
      // ruído mínimo e fixo por raio (tecelagem levemente imperfeita, sem quebrar a forma)
      return RINGS.map((radius, ri) => {
        const jitter = radius === 0 || radius === RINGS[RINGS.length - 1] ? 1 : 1 + (Math.random() - 0.5) * 0.02;
        const r = radius * jitter;
        return {
          x: anchor.x + dir.x * r,
          y: anchor.y + dir.y * r,
          restX: anchor.x + dir.x * r,
          restY: anchor.y + dir.y * r,
          vx: 0,
          vy: 0,
          si,
          ri,
          pinned: ri === 0 || ri === RINGS.length - 1,
          phase: Math.random() * Math.PI * 2,
        };
      });
    });

    const spokeEls = SPOKE_ANGLES.map(() => {
      const p = document.createElementNS(SVGNS, "polyline");
      el.appendChild(p);
      return p;
    });
    const ringEls = RINGS.map((radius, ri) => {
      if (ri === 0) return null;
      const p = document.createElementNS(SVGNS, "path");
      p.style.strokeWidth = String(1.1 - ri * 0.15);
      p.style.opacity = String(1 - ri * 0.14);
      el.appendChild(p);
      return p;
    });

    return { el, isRight, bySpokeRing, spokeEls, ringEls };
  });

  function draw(web) {
    web.spokeEls.forEach((p, si) => {
      p.setAttribute("points", web.bySpokeRing[si].map((n) => `${n.x.toFixed(2)},${n.y.toFixed(2)}`).join(" "));
    });
    web.ringEls.forEach((p, ri) => {
      if (!p) return;
      p.setAttribute("d", smoothPath(web.bySpokeRing.map((spoke) => spoke[ri])));
    });
  }

  // desenha a forma de repouso imediatamente — a teia é decorativa e deve
  // aparecer mesmo sem animação (reduzir movimento, telas sem cursor, etc.)
  webs.forEach(draw);
  if (!animate) return;

  window.addEventListener(
    "mousemove",
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    },
    { passive: true },
  );

  let t = 0;
  function tick() {
    t += 0.016;
    webs.forEach((web) => {
      const rect = web.el.getBoundingClientRect();
      const scale = 200 / rect.width;
      const localMouseX = (mouseX - rect.left) * scale;
      const localMouseY = (mouseY - rect.top) * scale;
      let peakInfluence = 0;

      // vento: uma direção predominante que deriva devagar, com rajadas que
      // sobem e descem de força — não cada nó balançando sozinho, mas a teia
      // inteira respondendo a uma corrente de ar que passa por ela
      const windAngle = (web.isRight ? Math.PI - 0.9 : -0.9) + Math.sin(t * 0.07) * 0.35;
      const gust = 0.55 + 0.45 * Math.sin(t * GUST_SPEED + (web.isRight ? 2.4 : 0));

      web.bySpokeRing.forEach((spoke, si) => {
        spoke.forEach((n) => {
          if (n.pinned) return;

          const dist = Math.hypot(localMouseX - n.x, localMouseY - n.y);
          let pullX = 0;
          let pullY = 0;
          if (dist < MAX_DIST) {
            const influence = 1 - dist / MAX_DIST;
            const ang = Math.atan2(localMouseY - n.y, localMouseX - n.x);
            pullX = Math.cos(ang) * influence * MAX_PULL;
            pullY = Math.sin(ang) * influence * MAX_PULL;
            if (influence > peakInfluence) peakInfluence = influence;
          }

          let neighSumX = 0;
          let neighSumY = 0;
          let count = 0;
          [spoke[n.ri - 1], spoke[n.ri + 1], web.bySpokeRing[si - 1] && web.bySpokeRing[si - 1][n.ri], web.bySpokeRing[si + 1] && web.bySpokeRing[si + 1][n.ri]].forEach((nb) => {
            if (!nb) return;
            neighSumX += nb.x - nb.restX;
            neighSumY += nb.y - nb.restY;
            count++;
          });
          const neighAvgX = count ? neighSumX / count : 0;
          const neighAvgY = count ? neighSumY / count : 0;

          // quanto mais longe do canto, mais a fiada balança no vento (como
          // seda presa só numa ponta) + uma trepidação fina por fio por cima
          const reach = n.ri / (RINGS.length - 2);
          const windMag = WIND_AMP * gust * reach;
          const flutter = Math.sin(t * WIND_SPEED * 2.4 + n.phase) * 1.6 * reach;
          const windX = Math.cos(windAngle) * windMag + Math.cos(n.phase) * flutter;
          const windY = Math.sin(windAngle) * windMag + Math.sin(n.phase) * flutter;

          const targetDX = pullX + neighAvgX * COUPLING + windX;
          const targetDY = pullY + neighAvgY * COUPLING + windY;
          const curDX = n.x - n.restX;
          const curDY = n.y - n.restY;

          n.vx += (targetDX - curDX) * STIFFNESS;
          n.vy += (targetDY - curDY) * STIFFNESS;
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        });
      });

      draw(web);
      web.el.style.opacity = 0.34 + peakInfluence * 0.4;
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// ═══════════════════════════════════════
// NAV MOBILE
// ═══════════════════════════════════════
const navLinks = document.getElementById("nav-links");
document.getElementById("nav-toggle").addEventListener("click", () => {
  navLinks.classList.toggle("open");
});
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") navLinks.classList.remove("open");
});

// ═══════════════════════════════════════
// SFX MARQUEE
// ═══════════════════════════════════════
// palavras soltas direto na faixa (sem agrupar), repetidas 2x com o MESMO
// espaçamento em toda a extensão — assim translateX(-50%) fecha o loop sem
// nenhuma emenda visível, já que as duas metades são idênticas ponto a ponto
const SFX_WORDS = ["THWIP!", "POW!", "SNAP!", "WEB-SLING!", "CRASH!", "BOOM!"];
const sfxTrack = document.getElementById("sfx-track");
for (let rep = 0; rep < 2; rep++) {
  SFX_WORDS.forEach((w) => {
    const el = document.createElement("span");
    el.textContent = w;
    sfxTrack.appendChild(el);
  });
}

// ═══════════════════════════════════════
// MEDIA CARDS (Cultura Pop)
// ═══════════════════════════════════════
const mediaGrid = document.getElementById("media-grid");
MEDIA.forEach((m, i) => {
  const card = document.createElement("div");
  card.className = `media-card reveal d${i + 1}`;
  card.tabIndex = 0;
  card.innerHTML = `
    <img src="${m.img}" alt="${m.title}" loading="lazy" width="900" height="1200" style="${m.pos ? `object-position:${m.pos}` : ""}" />
    <div class="media-card-body">
      <span class="tag">${m.subtitle}</span>
      <h3>${m.title}</h3>
      <p>${m.text}</p>
    </div>
  `;
  mediaGrid.appendChild(card);
});

// ═══════════════════════════════════════
// FIGURE GRID (Aranha-Verso)
// ═══════════════════════════════════════
const figGrid = document.getElementById("fig-grid");
FIGURES.forEach((f, i) => {
  const card = document.createElement("button");
  card.className = `fig-figure reveal d${(i % 4) + 1}`;
  card.setAttribute("aria-haspopup", "dialog");
  card.setAttribute("aria-label", `Ver dossiê de ${f.name}`);
  card.innerHTML = `
    <div class="fig-figure-img"><img src="${f.cutout}" alt="${f.name}" loading="lazy" width="600" height="600" /></div>
    <span class="fig-figure-tag">${f.name}</span>
    <span class="fig-figure-sub">${f.tag}</span>
  `;
  card.addEventListener("click", () => openDossier(f));
  figGrid.appendChild(card);
});

// ═══════════════════════════════════════
// SYMBIOTE GRID
// ═══════════════════════════════════════
const symbGrid = document.getElementById("symb-grid");
SYMBIOTES.forEach((s, i) => {
  const card = document.createElement("button");
  card.className = `symb-card reveal d${(i % 4) + 1}`;
  card.setAttribute("aria-haspopup", "dialog");
  card.innerHTML = `
    <span class="click-hint">Ver dossiê</span>
    <div class="symb-card-img"><img src="${s.img}" alt="${s.name}" loading="lazy" width="700" height="933" /></div>
    <div class="symb-card-body">
      <h3>${s.name}</h3>
      <span class="tag">${s.tag}</span>
    </div>
  `;
  card.addEventListener("click", () => openDossier(s));
  symbGrid.appendChild(card);
});

// ═══════════════════════════════════════
// COMIC DOSSIER MODAL
// ═══════════════════════════════════════
const overlay = document.getElementById("dossier-overlay");
let lastFocused = null;

function openDossier(data) {
  document.getElementById("d-img").src = data.img;
  document.getElementById("d-img").alt = data.name;
  document.getElementById("d-issue").textContent = "EDIÇÃO " + data.issue;
  document.getElementById("d-name").textContent = data.name;
  document.getElementById("d-alias").textContent = data.alias;
  document.getElementById("d-earth").textContent = data.earth;
  document.getElementById("d-text").textContent = data.text;
  const powersList = document.getElementById("d-powers");
  powersList.innerHTML = data.powers.map((p) => `<li>${p}</li>`).join("");

  lastFocused = document.activeElement;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  document.getElementById("dossier-close").focus();
}

function closeDossier() {
  overlay.classList.remove("open");
  document.body.style.overflow = "";
  if (lastFocused) lastFocused.focus();
}

document.getElementById("dossier-close").addEventListener("click", closeDossier);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeDossier();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("open")) closeDossier();
});

// ═══════════════════════════════════════
// SCROLL EFFECTS: hero parallax + reveal
// ═══════════════════════════════════════
const heroBg = document.getElementById("hero-bg");
window.addEventListener(
  "scroll",
  () => {
    const st = window.scrollY;
    if (heroBg) heroBg.style.translate = `0 ${st * 0.22}px`;
  },
  { passive: true },
);

const obs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("vis");
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -50px 0px" },
);
document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));

setTimeout(() => heroBg && heroBg.classList.add("loaded"), 100);
