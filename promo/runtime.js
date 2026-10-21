// Motion layer injected into every promo page before the app loads.
// It adds the animated cursor, click ripples, captions, title and end cards,
// page wipes and camera moves. It never changes app data or behaviour.
(() => {
  if (window.__promo) return;

  const BRAND = "#1e6b45";
  const INK = "#17261d";

  const css = `
    #pm-stage { transform-origin: 50% 50%; will-change: transform; }
    #pm-stage.pm-zoomed { transform-origin: var(--pm-ox, 50%) var(--pm-oy, 50%); }
    .pm-layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; }
    #pm-cursor { position: absolute; left: 0; top: 0; width: 34px; height: 34px;
      transform: translate(960px, 540px); filter: drop-shadow(0 3px 6px rgba(0,0,0,.28)); }
    .pm-ripple { position: absolute; left: 0; top: 0; width: 56px; height: 56px; margin: -28px 0 0 -28px;
      border-radius: 50%; border: 3px solid ${BRAND}; background: rgba(30,107,69,.16);
      animation: pm-ripple .65s cubic-bezier(.2,.7,.3,1) forwards; }
    @keyframes pm-ripple { from { transform: scale(.35); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }

    #pm-card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center; padding: 0 120px; overflow: hidden; opacity: 0;
      transition: opacity .6s ease; color: #fff;
      background: radial-gradient(120% 95% at 25% 15%, #2d8f5f 0%, ${BRAND} 46%, #0f3a25 100%); }
    #pm-card.light { color: ${INK};
      background: radial-gradient(110% 90% at 75% 10%, #ffffff 0%, #f1f7f3 55%, #dcebe1 100%); }
    #pm-card.on { opacity: 1; }
    #pm-card::after { content: ""; position: absolute; top: -10%; bottom: -10%; width: 35%; left: -50%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.13), transparent);
      transform: skewX(-12deg); animation: pm-sweep 4.2s ease-in-out infinite; }
    #pm-card.light::after { display: none; }
    @keyframes pm-sweep { from { left: -50%; } to { left: 120%; } }
    .pm-mark { width: 88px; height: 88px; border-radius: 24px; background: rgba(255,255,255,.14);
      display: grid; place-items: center; margin-bottom: 36px; opacity: 0; transform: scale(.7);
      transition: opacity .7s ease, transform .9s cubic-bezier(.2,.8,.2,1); }
    #pm-card.light .pm-mark { background: ${BRAND}; }
    #pm-card.on .pm-mark { opacity: 1; transform: none; }
    .pm-title { font-size: 124px; font-weight: 750; letter-spacing: -.035em; line-height: 1; white-space: nowrap; }
    .pm-title span { display: inline-block; opacity: 0; transform: translateY(60px) rotate(4deg);
      transition: opacity .6s ease, transform .9s cubic-bezier(.2,.8,.2,1); }
    #pm-card.on .pm-title span { opacity: 1; transform: none; }
    .pm-sub { margin-top: 34px; font-size: 36px; font-weight: 450; letter-spacing: -.01em; opacity: 0;
      transform: translateY(18px); transition: opacity .8s ease .9s, transform .8s ease .9s; color: #c8e6d4; }
    #pm-card.light .pm-sub { color: #3f5a4a; }
    #pm-card.on .pm-sub { opacity: 1; transform: none; }
    .pm-chips { display: flex; gap: 14px; margin-top: 46px; opacity: 0; transition: opacity .8s ease 1.4s; }
    #pm-card.on .pm-chips { opacity: 1; }
    .pm-chip { padding: 12px 22px; border-radius: 999px; font-size: 22px; font-weight: 550;
      background: rgba(255,255,255,.14); color: #eaf6ee; }
    #pm-card.light .pm-chip { background: #e2f0e7; color: ${BRAND}; }

    #pm-caption { position: absolute; left: 64px; bottom: 60px; display: flex; align-items: center; gap: 22px;
      padding: 18px 34px 18px 18px; border-radius: 22px; background: rgba(12,28,20,.84);
      box-shadow: 0 22px 46px rgba(0,0,0,.28); color: #fff; opacity: 0; transform: translateY(28px);
      transition: opacity .45s ease, transform .7s cubic-bezier(.2,.8,.2,1); }
    #pm-caption.on { opacity: 1; transform: none; }
    #pm-caption .num { width: 60px; height: 60px; border-radius: 16px; background: #2f9a68; display: grid;
      place-items: center; font-size: 23px; font-weight: 700; letter-spacing: .02em; }
    #pm-caption h3 { margin: 0; font-size: 33px; font-weight: 650; letter-spacing: -.012em; }
    #pm-caption p { margin: 6px 0 0; font-size: 21px; color: #bfdccb; }

    #pm-wipe { position: absolute; inset: 0; background: ${BRAND}; transform: translateX(-101%);
      transition: transform .65s cubic-bezier(.75,0,.2,1); }
    #pm-wipe.in { transform: translateX(0); }
    #pm-wipe.out { transform: translateX(101%); }
    #pm-wipe.hold { transition: none; transform: translateX(0); }
  `;

  const cover = sessionStorage.getItem("pm-cover") === "1";
  const cursorSvg = `<svg width="34" height="34" viewBox="0 0 24 24"><path d="M5 2.5v17.2l4.6-4.4 3 6.6 2.9-1.3-3-6.5h6.4z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
  const carSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V11.5l2-5h10l2 5V16"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1.6" fill="#fff"/><circle cx="16.5" cy="16" r="1.6" fill="#fff"/></svg>`;

  let stage;
  let layer;
  let cursor;
  let card;
  let caption;
  let wipe;

  function mountLayers() {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    stage = document.createElement("div");
    stage.id = "pm-stage";
    const children = [...document.body.childNodes];
    document.body.appendChild(stage);
    children.forEach((node) => stage.appendChild(node));
    document.body.style.overflowX = "hidden";

    layer = document.createElement("div");
    layer.className = "pm-layer";
    layer.innerHTML = `
      <div id="pm-card"></div>
      <div id="pm-caption"></div>
      <div id="pm-wipe"></div>
      <div id="pm-cursor">${cursorSvg}</div>`;
    document.body.appendChild(layer);
    cursor = layer.querySelector("#pm-cursor");
    card = layer.querySelector("#pm-card");
    caption = layer.querySelector("#pm-caption");
    wipe = layer.querySelector("#pm-wipe");
    if (cover) {
      wipe.classList.add("hold");
      wipe.classList.add("in");
      requestAnimationFrame(() => wipe.classList.remove("hold"));
    }
  }

  function setCursor(x, y) {
    cursor.style.transform = `translate(${x}px, ${y}px)`;
  }

  function ripple(x, y) {
    const r = document.createElement("div");
    r.className = "pm-ripple";
    r.style.left = `${x}px`;
    r.style.top = `${y}px`;
    layer.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }

  function letters(text) {
    return [...text]
      .map((ch, i) => {
        const safe = ch === " " ? "&nbsp;" : ch;
        return `<span style="transition-delay:${(i * 38).toFixed(0)}ms">${safe}</span>`;
      })
      .join("");
  }

  window.__promo = {
    cursorAt(x, y) {
      setCursor(x, y);
    },
    card({ title, sub, chips = [], light = false }) {
      card.className = light ? "light" : "";
      card.innerHTML = `
        <div class="pm-mark">${carSvg}</div>
        <div class="pm-title">${letters(title)}</div>
        <div class="pm-sub">${sub}</div>
        <div class="pm-chips">${chips.map((c) => `<span class="pm-chip">${c}</span>`).join("")}</div>`;
      void card.offsetWidth;
      card.classList.add("on");
    },
    hideCard() {
      card.classList.remove("on");
    },
    caption(num, title, sub) {
      caption.innerHTML = `<div class="num">${num}</div><div><h3>${title}</h3><p>${sub}</p></div>`;
      void caption.offsetWidth;
      caption.classList.add("on");
    },
    hideCaption() {
      caption.classList.remove("on");
    },
    zoom(scale, ox, oy, ms) {
      stage.style.transition = `transform ${ms}ms cubic-bezier(.45,0,.2,1)`;
      stage.style.setProperty("--pm-ox", `${ox}%`);
      stage.style.setProperty("--pm-oy", `${oy}%`);
      stage.style.transformOrigin = `${ox}% ${oy}%`;
      stage.style.transform = scale === 1 ? "none" : `scale(${scale})`;
    },
    // Covers the screen, then the caller navigates; the next page starts covered.
    wipeIn() {
      sessionStorage.setItem("pm-cover", "1");
      wipe.classList.remove("out");
      wipe.classList.add("in");
    },
    wipeOut() {
      sessionStorage.removeItem("pm-cover");
      wipe.classList.remove("in");
      wipe.classList.add("out");
      setTimeout(() => wipe.classList.remove("out"), 800);
    },
  };

  window.addEventListener("mousemove", (e) => setCursor(e.clientX, e.clientY), true);
  window.addEventListener("mousedown", (e) => ripple(e.clientX, e.clientY), true);

  document.addEventListener("DOMContentLoaded", mountLayers);
})();
