/**
 * The mission HUD's styles (src/scenes/mission/hud.ts), shared by the game
 * and dev/mission.html: the HUD root has class ikt-hud. Injected once.
 */
export const HUD_CSS = `
.ikt-hud { position: fixed; inset: 0; pointer-events: none; z-index: 2; }
.ikt-hud .feed { position: absolute; left: 12px; top: 10px; display: flex; flex-direction: column; gap: 3px; }
.ikt-hud .feed div { background: rgba(20, 18, 14, 0.62); padding: 3px 8px; border-radius: 4px; }
.ikt-hud .feed i { color: #e0b040; font-style: normal; }
.ikt-hud .bp { display: inline-block; width: 24px; height: 24px; vertical-align: -6px; }
.ikt-hud .bpn { color: #bcd8ff; white-space: nowrap; }
.ikt-hud .red { color: #ff7a5a; }
.ikt-hud .topright { position: absolute; right: 12px; top: 10px; text-align: right; }
.ikt-hud .mini { display: block; border: 2px solid rgba(20, 18, 14, 0.8); border-radius: 4px; background: #d9ccaa; }
.ikt-hud .row { display: flex; justify-content: space-between; gap: 10px; margin-top: 4px; }
.ikt-hud .kits { display: flex; align-items: center; gap: 2px; white-space: nowrap; }
.ikt-hud .kits img { width: 32px; height: 32px; image-rendering: pixelated; }
.ikt-hud .kits .off { opacity: 0.25; filter: grayscale(1); }
.ikt-hud .kits i { display: inline-block; width: 24px; text-align: center; font-style: normal; font-weight: 700; color: #f0c040; }
.ikt-hud .kits em { font-style: normal; font-size: 12px; color: #8cc85a; margin-left: 4px; }
.ikt-hud kbd { display: inline-block; min-width: 18px; padding: 0 4px; margin-left: 4px; border: 1px solid rgba(244, 236, 216, 0.7); border-bottom-width: 3px; border-radius: 4px; font: 700 12px ui-monospace, Menlo, monospace; text-align: center; line-height: 16px; color: #f4ecd8; background: #2a2620; }
.ikt-hud .tip { display: none; position: absolute; left: 50%; bottom: 76px; transform: translateX(-50%); background: rgba(20, 18, 14, 0.85); border: 1px solid #f0c040; padding: 6px 12px; border-radius: 6px; font-size: 15px; white-space: nowrap; }
.ikt-hud .row span { background: rgba(20, 18, 14, 0.62); padding: 2px 7px; border-radius: 4px; }
.ikt-hud .arrow { display: none; position: absolute; left: 0; top: 0; width: 0; height: 0; margin: -12px 0 0 -12px; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 24px solid #f0c040; filter: drop-shadow(0 1px 1px #000); }
.ikt-hud .goal { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); background: rgba(20, 18, 14, 0.72); padding: 5px 12px; border-radius: 4px; font-size: 16px; white-space: nowrap; }
.ikt-hud .bottom { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; background: rgba(20, 18, 14, 0.62); padding: 6px 10px; border-radius: 6px; }
.ikt-hud .hpbar { position: relative; width: 220px; height: 16px; background: #2a2620; border-radius: 3px; overflow: hidden; }
.ikt-hud .hpbar i { position: absolute; inset: 0 auto 0 0; }
.ikt-hud .hpbar b { position: absolute; inset: 0; text-align: center; font-size: 12px; line-height: 16px; text-shadow: 0 1px 0 #000; }
.ic { position: relative; display: inline-block; width: 36px; height: 36px; background: #3a3428; border-radius: 4px; vertical-align: middle; }
.ic img { width: 36px; height: 36px; image-rendering: pixelated; }
.ic.txt { font-size: 11px; text-align: center; line-height: 30px; }
.ic em { position: absolute; right: 1px; bottom: -2px; font-size: 10px; font-style: normal; color: #f0c040; }
.ikt-hud .icons { display: flex; gap: 4px; }
.ikt-hud .card { display: none; position: absolute; left: 50%; bottom: 76px; transform: translateX(-50%); background: rgba(20, 18, 14, 0.85); padding: 8px 12px; border-radius: 6px; min-width: 220px; }
.ikt-hud .card .title { margin-bottom: 4px; }
.ikt-hud .card .up { color: #8cc85a; } .ikt-hud .card .down { color: #ff7a5a; }
.ikt-hud .card .hint { opacity: 0.7; font-size: 12px; margin-top: 4px; }
.ikt-hud .card .hold { height: 4px; background: #2a2620; margin-top: 4px; } .ikt-hud .card .hold i { display: block; height: 4px; background: #f0c040; }
.ikt-hud .btn { display: none; position: absolute; pointer-events: auto; width: 84px; height: 84px; border-radius: 50%; border: 2px solid rgba(244, 236, 216, 0.6); background: rgba(20, 18, 14, 0.6); color: #f4ecd8; font: 700 15px ui-monospace, Menlo, monospace; }
.ikt-hud .gadget { display: flex; align-items: center; gap: 2px; white-space: nowrap; }
.ikt-hud .gadget img { width: 32px; height: 32px; image-rendering: pixelated; }
.ikt-hud .gadget i { font-style: normal; font-weight: 700; color: #f0c040; }
.ikt-hud .gadget b { font-size: 14px; color: #f4ecd8; min-width: 10px; }
.ikt-hud .gadget.off img, .ikt-hud .gadget.off i { opacity: 0.3; filter: grayscale(1); }
.ikt-hud .gadgetbtn { right: 116px; bottom: 236px; width: 76px; height: 76px; padding: 0; font-size: 11px; }
.ikt-hud .gadgetbtn img { width: 44px; height: 44px; image-rendering: pixelated; display: block; margin: 0 auto; }
.ikt-hud .gadgetbtn b { position: absolute; right: 8px; bottom: 6px; font-size: 15px; color: #f0c040; }
.ikt-hud .gadgetbtn.off { opacity: 0.4; }
.ikt-hud .pops { position: absolute; inset: 0; overflow: hidden; }
.ikt-hud .pop { position: absolute; left: 0; top: 0; font: 700 18px ui-monospace, Menlo, monospace; color: #f0c040; text-shadow: 0 2px 0 #14110c, 0 0 4px #14110c; white-space: nowrap; }
.ikt-hud .swap { right: 150px; bottom: 150px; } .ikt-hud .repair { right: 40px; bottom: 210px; width: 64px; height: 64px; font-size: 12px; }
@media (pointer: coarse) { .ikt-hud .bottom { bottom: 8px; transform: translateX(-50%) scale(1.1); } .ikt-hud .mini { width: 150px; height: auto; } }
.stick { position: fixed; width: 136px; height: 136px; margin: -68px 0 0 -68px; border-radius: 50%; background: rgba(244, 236, 216, 0.18); border: 2px solid rgba(244, 236, 216, 0.5); z-index: 3; pointer-events: none; }
.stick i { position: absolute; left: 46px; top: 46px; width: 44px; height: 44px; border-radius: 50%; background: rgba(244, 236, 216, 0.85); }
`;
