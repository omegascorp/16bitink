/**
 * The game's screens in pixel UI: Ark Pixel 12 drawn at whole multiples of
 * its 12 px design size, flat inked panels with stepped corners, chunky
 * buttons. Scoped under .ikt (the game's root), so nothing leaks into the
 * site's page. Sizes step up on big screens; phones keep 24 px text.
 */
export const SCREENS_CSS = `
.ikt { position: absolute; inset: 0; overflow: hidden; background: #1b1a16; color: #f4ecd8; touch-action: none; user-select: none; -webkit-user-select: none;
  font: 24px/1.25 ArkPixel12, ui-monospace, monospace; -webkit-font-smoothing: none; --gold: #f0c040; --ink: #14110c; --panel: #2b251c; --edge: #5c4a30; --dim: #a89c80; --green: #8cc85a; --red: #ff7a5a; --blue: #3c6cc8; }
.ikt * { box-sizing: border-box; }
.ikt [hidden] { display: none !important; }
.ikt .stage, .ikt .stage canvas { position: absolute; inset: 0; display: block; image-rendering: pixelated; }
.ikt .screen { position: absolute; inset: 0; z-index: 4; display: flex; align-items: center; justify-content: center; padding: max(10px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); }
.ikt .screen.dim { background: rgba(20, 17, 12, 0.55); }
.ikt .screen.dark { background: rgba(20, 17, 12, 0.86); }
.ikt-hud { font: 24px/1.2 ArkPixel12, ui-monospace, monospace; z-index: 2; }
.ikt-hud .goal { font-size: 24px; }
.ikt-hud .hpbar b, .ikt-hud .ic em, .ikt-hud .card .hint { font-size: 12px; }
.ikt h1, .ikt h2, .ikt h3, .ikt p { margin: 0; font-weight: normal; }
.ikt .t36 { font-size: 36px; line-height: 1.1; }
.ikt .t48 { font-size: 48px; line-height: 1; }
.ikt .t12 { font-size: 12px; }
.ikt .gold { color: var(--gold); } .ikt .dimt { color: var(--dim); } .ikt .green { color: var(--green); } .ikt .red { color: var(--red); }
.ikt .shadow { text-shadow: 2px 2px 0 var(--ink); }
.ikt .panel { position: relative; background: var(--panel); border: 4px solid var(--ink); box-shadow: inset 0 0 0 2px var(--edge), 0 4px 0 rgba(0,0,0,0.35);
  clip-path: polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)); padding: 14px 18px; }
.ikt .panel.paper { background: #e8dcbc; color: #2a2116; box-shadow: inset 0 0 0 2px #b8a47c; }
.ikt .well { background: #1f1a13; box-shadow: inset 0 2px 0 #0e0c08; padding: 8px 10px; }
.ikt .screen .btn { font: inherit; font-size: 24px; color: #f4ecd8; background: #6b5434; border: 0; padding: 8px 18px 10px; min-height: 48px; cursor: pointer; box-shadow: inset 0 -4px 0 #3e301c, inset 0 2px 0 #9a7c4c, 0 0 0 4px var(--ink); margin: 4px; white-space: nowrap; }
.ikt .screen .btn:hover { filter: brightness(1.12); } .ikt .screen .btn:active { transform: translateY(2px); box-shadow: inset 0 -2px 0 #3e301c, 0 0 0 4px var(--ink); }
.ikt .screen .btn.go { background: #3f7a3a; box-shadow: inset 0 -4px 0 #24481f, inset 0 2px 0 #6aa85a, 0 0 0 4px var(--ink); }
.ikt .screen .btn.gold { color: #2a2116; background: #d8a838; box-shadow: inset 0 -4px 0 #8a6618, inset 0 2px 0 #f6d878, 0 0 0 4px var(--ink); }
.ikt .screen .btn.small { font-size: 12px; min-height: 32px; padding: 4px 10px 6px; }
.ikt .screen .btn[disabled] { filter: grayscale(0.9) brightness(0.7); cursor: default; transform: none; }
.ikt .row { display: flex; align-items: center; gap: 10px; } .ikt .col { display: flex; flex-direction: column; gap: 8px; }
.ikt .spread { justify-content: space-between; } .ikt .center { justify-content: center; text-align: center; }
.ikt .medal { display: inline-block; width: 20px; height: 20px; background: #4a4030; box-shadow: inset 0 -3px 0 #2e271c, 0 0 0 2px var(--ink); vertical-align: -3px; margin-right: 6px;
  clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%); }
.ikt .medal.on { background: var(--gold); box-shadow: inset 0 -3px 0 #a87818, inset 0 3px 0 #ffe8a0; }
.ikt .medal.pop { animation: ikt-pop 0.7s steps(6) both; }
@keyframes ikt-pop { 0% { transform: scale(0.2); filter: brightness(3); } 60% { transform: scale(1.5); } 100% { transform: scale(1); } }
.ikt .rise { animation: ikt-rise 0.5s steps(5) both; } @keyframes ikt-rise { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }
.ikt .bar { position: relative; height: 12px; background: #14110c; box-shadow: 0 0 0 2px #3a3020; }
.ikt .bar i { position: absolute; inset: 0 auto 0 0; background: var(--gold); box-shadow: inset 0 -3px 0 rgba(0,0,0,0.3); }
.ikt .bar i.xp { background: var(--blue); }
.ikt .tankpic { image-rendering: pixelated; display: block; }
.ikt .rank { display: inline-flex; align-items: center; gap: 6px; } .ikt .rank i { display: inline-block; width: 22px; height: 16px; background: var(--gold); box-shadow: 0 0 0 2px var(--ink); clip-path: polygon(0 0, 50% 45%, 100% 0, 100% 40%, 50% 100%, 0 40%); }
.ikt-hud .pausebtn { position: absolute; left: max(12px, env(safe-area-inset-left)); top: max(10px, env(safe-area-inset-top)); pointer-events: auto; font: inherit; font-size: 12px; color: #f4ecd8; background: #6b5434; border: 0; padding: 6px 12px; min-height: 36px; cursor: pointer; box-shadow: inset 0 -3px 0 #3e301c, 0 0 0 3px #14110c; }
.ikt-hud .feed { top: 60px; }
.ikt-hud .btn { font-family: inherit; }
/* Menu */
.ikt .menu { flex-direction: column; gap: 18px; }
.ikt .wordmark { font-size: 96px; line-height: 0.9; color: var(--gold); text-shadow: 4px 4px 0 #6b3a1c, 8px 8px 0 var(--ink); letter-spacing: 2px; }
.ikt .chaptercard { width: min(460px, 92vw); display: flex; gap: 14px; align-items: center; }
.ikt .corner { position: absolute; top: max(10px, env(safe-area-inset-top)); display: flex; gap: 6px; z-index: 6; }
.ikt .corner.left { left: max(12px, env(safe-area-inset-left)); } .ikt .corner.right { right: max(12px, env(safe-area-inset-right)); }
/* Chapter map */
.ikt .trail { position: absolute; inset: 0; pointer-events: none; }
.ikt .trail polyline { fill: none; stroke: #f4ecd8; stroke-width: 4; stroke-dasharray: 8 10; opacity: 0.85; filter: drop-shadow(2px 2px 0 #14110c); }
.ikt .map { align-items: stretch; justify-content: stretch; padding: 0; }
.ikt .map .top { position: absolute; left: 50%; top: max(8px, env(safe-area-inset-top)); transform: translateX(-50%); text-align: center; padding: 6px 18px; white-space: nowrap; }
.ikt .spot { position: absolute; transform: translate(-50%, -50%); width: 56px; height: 56px; border: 0; padding: 0; cursor: pointer; font: inherit; font-size: 24px; color: #2a2116; background: #e8dcbc;
  box-shadow: inset 0 -5px 0 #b8a47c, 0 0 0 4px var(--ink), 0 6px 0 4px rgba(0,0,0,0.35); clip-path: polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%); }
.ikt .spot.done { background: #f0d890; } .ikt .spot.locked { background: #6a6050; color: #3a3428; cursor: default; }
.ikt .spot.next { background: var(--gold); animation: ikt-bob 1s steps(2) infinite; }
@keyframes ikt-bob { 50% { transform: translate(-50%, calc(-50% - 4px)); } }
.ikt .spotmedals { position: absolute; transform: translate(-50%, 0); display: flex; gap: 2px; pointer-events: none; }
.ikt .spotmedals .medal { width: 14px; height: 14px; margin: 0; }
.ikt .spotname { position: absolute; transform: translate(-50%, 0); font-size: 12px; pointer-events: none; white-space: nowrap; background: rgba(20,17,12,0.75); padding: 1px 5px; }
.ikt .chapters { position: absolute; left: 50%; bottom: max(8px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; gap: 8px; }
.ikt .chip { font: inherit; font-size: 12px; padding: 6px 10px; min-width: 96px; text-align: center; border: 0; color: #f4ecd8; background: #3a3226; box-shadow: 0 0 0 3px var(--ink), inset 0 -3px 0 #221c14; cursor: pointer; }
.ikt .chip.here { background: #6b5434; color: var(--gold); } .ikt .chip b { display: block; font-weight: normal; font-size: 12px; color: var(--dim); }
/* Blueprints: the icon next to every amount and cost, the Workshop badge */
.ikt .bp { display: inline-block; width: 1.75em; height: 1.75em; vertical-align: -0.5em; image-rendering: auto; }
.ikt .bp.txt { width: auto; color: #8ec0ff; font-style: normal; }
.ikt .bpn { white-space: nowrap; color: #bcd8ff; }
.ikt .wsbtn { position: relative; }
.ikt .badge { position: absolute; right: -10px; top: -14px; min-width: 24px; height: 24px; padding: 0 5px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: normal; color: #fff; background: #d8402c; box-shadow: 0 0 0 3px var(--ink); }
.ikt .wsbtn.ready { animation: ikt-glow 1.2s steps(2) infinite; }
@keyframes ikt-glow { 50% { filter: brightness(1.25); } }
.ikt .ready-line { color: var(--gold); background: #3a2c14; box-shadow: inset 0 0 0 2px var(--gold); padding: 4px 8px; }
.ikt .bplist { display: grid; grid-template-columns: 28px 1fr auto; gap: 2px 8px; align-items: center; }
.ikt .bplist .ic { width: 28px; height: 28px; position: relative; display: block; background: #3a3428; }
.ikt .bplist .ic img { width: 28px; height: 28px; image-rendering: pixelated; }
.ikt .bplist .ic em { position: absolute; right: 0; bottom: -3px; font-size: 12px; font-style: normal; color: var(--gold); }
.ikt .explain { color: var(--dim); font-size: 12px; max-width: 70ch; }
.ikt .fam .famhead { min-width: 0; line-height: 1.3; } .ikt .fam .famhead .t12 { white-space: nowrap; }
.ikt .fam .bpline { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 6px; } .ikt .fam .bar.wide { grid-column: 1 / -1; }
.ikt .fam .bpline .big { font-size: 24px; }
.ikt .fam .acts .btn { flex: 1 1 100%; display: flex; flex-direction: column; align-items: center; line-height: 1.15; }
.ikt .screen .btn.dim { filter: none; opacity: 0.55; background: #4a4030; box-shadow: inset 0 -4px 0 #2e271c, 0 0 0 4px var(--ink); color: #c9bda0; }
.ikt .screen .btn.dim:hover { filter: none; }
.ikt .btn .why2 { font-size: 12px; color: var(--red); }
.ikt .pips { display: inline-flex; gap: 2px; margin-left: 4px; vertical-align: 1px; } .ikt .pips u { width: 6px; height: 6px; background: #14110c; box-shadow: 0 0 0 1px #8a7a58; } .ikt .pips u.on { background: var(--gold); }
.ikt .lock { display: inline-block; width: 10px; height: 8px; background: currentColor; position: relative; margin-right: 4px; vertical-align: -1px; }
.ikt .lock::before { content: ''; position: absolute; left: 2px; top: -5px; width: 6px; height: 5px; border: 2px solid currentColor; border-bottom: 0; box-sizing: border-box; }
.ikt .commander { width: 96px; height: 96px; image-rendering: pixelated; box-shadow: 0 0 0 4px var(--ink); flex: 0 0 auto; background: #3a3428; }
@media (max-height: 520px) { .ikt .bplist { grid-template-columns: 28px 1fr auto 28px 1fr auto; font-size: 12px; gap: 4px 6px; } .ikt .bplist .bpn { font-size: 12px; } .ikt .commander { width: 72px; height: 72px; } .ikt .bp { width: 1.25em; height: 1.25em; } .ikt .fam .bpline .big { font-size: 24px; } }
/* Briefing, results, workshop */
.ikt .sheet { width: min(900px, 100%); max-height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
.ikt .sheet .cols { display: flex; gap: 16px; align-items: stretch; }
.ikt .sheet .cols > * { flex: 1 1 0; min-width: 0; }
.ikt .objective { font-size: 24px; color: var(--gold); }
.ikt .bonus { display: flex; align-items: center; gap: 4px; }
.ikt .minimap { width: 100%; height: auto; image-rendering: pixelated; box-shadow: 0 0 0 4px var(--ink); background: #d9ccaa; display: block; }
.ikt .gpicks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.ikt .gpick { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 4px; background: #241f17; color: inherit; font: inherit; font-size: 14px; border: 0; box-shadow: inset 0 0 0 2px #3a3020; cursor: pointer; min-height: 44px; }
.ikt .gpick img { width: 40px; height: 40px; image-rendering: pixelated; }
.ikt .gpick.on { box-shadow: inset 0 0 0 3px var(--gold); background: #3a2c14; color: var(--gold); }
.ikt .intelrow { display: grid; grid-template-columns: 1fr auto; gap: 2px 14px; }
.ikt .slots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: start; }
.ikt .slot { display: flex; flex-direction: column; gap: 6px; }
.ikt .fam { display: grid; grid-template-columns: 40px 1fr; min-width: 0; gap: 4px 8px; align-items: center; padding: 6px; background: #241f17; box-shadow: inset 0 0 0 2px #3a3020; }
.ikt .fam.fitted { box-shadow: inset 0 0 0 2px var(--gold); }
.ikt .fam.locked { opacity: 0.75; }
.ikt .fam .ic { width: 40px; height: 40px; background: #3a3428; display: flex; align-items: center; justify-content: center; font-size: 12px; position: relative; }
.ikt .fam .ic img { width: 40px; height: 40px; image-rendering: pixelated; }
.ikt .fam .ic em { position: absolute; right: 1px; bottom: -2px; font-size: 12px; font-style: normal; color: var(--gold); }
.ikt .fam .acts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 0 2px; }
.ikt .why { font-size: 12px; color: var(--dim); }
.ikt .promo { text-align: center; padding: 10px; background: #3a2c14; box-shadow: inset 0 0 0 2px var(--gold); animation: ikt-pop 0.8s steps(6) both; }
.ikt .modal { width: min(520px, 94vw); text-align: center; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.ikt .boot { flex-direction: column; gap: 16px; }
.ikt .boot .bar { width: min(360px, 70vw); }
@media (max-height: 520px) {
  .ikt .wordmark { font-size: 72px; }
  .ikt .menu { gap: 10px; }
  .ikt .panel { padding: 8px 12px; }
  .ikt .sheet { gap: 6px; }
  .ikt .screen .btn { min-height: 44px; padding: 6px 14px 8px; }
  .ikt .hide-short { display: none !important; }
  .ikt .t36 { font-size: 24px; }
  .ikt .chapters { gap: 6px; }
  .ikt .chip { min-width: 0; padding: 3px 8px; white-space: nowrap; flex: 0 0 auto; }
  .ikt .chip b { display: inline; margin-left: 6px; }
  .ikt .minimap { max-height: 36vh; width: auto; max-width: 100%; }
  .ikt .briefing .pic { display: none; }
  .ikt .gpick { flex-direction: row; justify-content: center; padding: 2px 4px; font-size: 12px; min-height: 36px; }
  .ikt .gpick img { width: 26px; height: 26px; }
  .ikt .briefing .minimap { max-height: 30vh; }
}
@media (min-height: 900px) and (min-width: 1400px) {
  .ikt { font-size: 36px; } .ikt .screen .btn { font-size: 36px; } .ikt .objective { font-size: 36px; }
  .ikt .t36 { font-size: 48px; } .ikt .sheet { width: min(1300px, 100%); }
}
@media (pointer: coarse) {
  .ikt-hud .goal { font-size: 24px; }
  .ikt-hud .feed { display: none; }
}
`;
