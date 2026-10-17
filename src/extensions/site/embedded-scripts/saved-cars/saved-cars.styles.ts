export const styles = `
:host { all: initial; }
* { box-sizing: border-box; }
.wrap {
  position: fixed; left: 20px; bottom: 20px; z-index: 2147483000;
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1d2b23;
}
.launcher {
  display: inline-flex; align-items: center; gap: 10px; height: 48px; padding: 0 8px 0 16px;
  border: 1px solid rgba(29, 43, 35, 0.1); border-radius: 999px; background: #fff; color: inherit;
  font: inherit; font-weight: 600; cursor: pointer;
  box-shadow: 0 10px 30px -10px rgba(16, 24, 20, 0.35), 0 2px 6px rgba(16, 24, 20, 0.08);
  animation: pop 220ms ease-out; transition: transform 150ms ease, box-shadow 150ms ease;
}
.launcher:hover { transform: translateY(-1px); box-shadow: 0 14px 34px -10px rgba(16, 24, 20, 0.4), 0 2px 6px rgba(16, 24, 20, 0.08); }
.launcher svg { color: var(--accent); }
.count {
  min-width: 32px; height: 32px; padding: 0 10px; border-radius: 999px; display: inline-grid; place-items: center;
  background: var(--accent); color: #fff; font-size: 13px;
}
.panel {
  position: absolute; left: 0; bottom: 60px; width: 360px; max-width: calc(100vw - 40px);
  max-height: min(520px, calc(100vh - 120px)); display: flex; flex-direction: column;
  background: #fff; border-radius: 18px; overflow: hidden; border: 1px solid rgba(29, 43, 35, 0.08);
  box-shadow: 0 24px 60px -16px rgba(16, 24, 20, 0.4); animation: rise 200ms ease-out;
}
.panel[hidden] { display: none; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 12px 20px; }
.title { margin: 0; font-size: 16px; font-weight: 700; }
.sub { margin: 2px 0 0; color: #66756c; font-size: 12px; }
.icon-btn {
  width: 32px; height: 32px; border: 0; border-radius: 999px; display: grid; place-items: center;
  background: transparent; color: #66756c; cursor: pointer;
}
.icon-btn:hover { background: #f1f4f2; color: #1d2b23; }
.list { list-style: none; margin: 0; padding: 4px 8px 8px; overflow-y: auto; }
.item { display: flex; align-items: center; gap: 4px; border-radius: 12px; }
.item:hover { background: #f6f8f7; }
.link { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 8px; color: inherit; text-decoration: none; }
.thumb { width: 72px; height: 48px; flex-shrink: 0; border-radius: 8px; object-fit: cover; background: #eef2ef; }
.name { margin: 0; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.price { margin: 2px 0 0; color: var(--accent); font-weight: 700; font-size: 13px; }
.foot { display: flex; justify-content: flex-end; padding: 10px 16px; border-top: 1px solid #edf1ee; }
.clear { border: 0; background: none; color: #66756c; font: inherit; font-size: 13px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.clear:hover { color: #a23a2c; }
:is(.launcher, .icon-btn, .link, .clear):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@keyframes pop { from { opacity: 0; transform: scale(0.9); } }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } }
@media (max-width: 480px) {
  .wrap { left: 12px; bottom: 12px; }
  .panel { width: calc(100vw - 24px); max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  .launcher, .panel { animation: none; transition: none; }
}
`;
