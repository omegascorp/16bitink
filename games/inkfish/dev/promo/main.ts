import { CHAIN, LOOP_S } from './chain';
import { makeSprite } from './sprites';
import { createRenderer, drawDebug } from './render';
import { CAPTION_FONT, drawCaptions, type CaptionSet } from './captions';
import { renderAudio } from './audio';
import type { Short } from './short';
import { createBiggerFish } from './bigger/render';
import { createDepth } from './depth/render';
import { createBirds } from './birds/render';
import { createLight } from './light/render';
import { createMates } from './mates/render';
import { createBlobfish } from './blobfish/render';
import { createGreenland } from './greenland/render';
import { createBarreleye } from './barreleye/render';
import { createOarfish } from './oarfish/render';
import { createCoelacanth } from './coelacanth/render';
import { createFangtooth } from './fangtooth/render';
import { createClownfish } from './clownfish/render';
import { createParrotfish } from './parrotfish/render';
import { createCusk } from './cusk/render';
import { createPuffer } from './puffer/render';
import { createGulper } from './gulper/render';
import { createFlyingFish } from './flyingfish/render';
import { createBlackdragon } from './blackdragon/render';
import { createRevenge } from './revenge/render';
import { createSpat } from './spat/render';
import { createInkCloud } from './inkcloud/render';
import { createBait } from './bait/render';
import { createFrenzy } from './frenzy/render';
import { createGape } from './gape/render';
import { createLeap } from './leap/render';
import { createWrasse } from './wrasse/render';
import { createTuna } from './tuna/render';
import { createPipefish } from './pipefish/render';
import { createLionfish } from './lionfish/render';
import { createMoray } from './moray/render';
import { createTripod } from './tripod/render';
import { createTrees } from './trees/render';
import { createGoldfish } from './goldfish/render';
import { createSurfer } from './surfer/render';
import { createDrown } from './drown/render';
import { createEels } from './eels/render';
import { createSwordfish } from './swordfish/render';
import { createGrouper } from './grouper/render';
import { createSharkSkin } from './sharkskin/render';
import { createGoliath } from './goliath/render';
import { createSwallower } from './swallower/render';
import { createMako } from './mako/render';
import { createPistol } from './pistol/render';
import { createSlurp } from './slurp/render';
import { createLure } from './lure/render';
import { createAxolotl } from './axolotl/render';
import { createDragon } from './dragon/render';
import { createFrogfish } from './frogfish/render';
import { createTigerShark } from './tigershark/render';
import { createKraken } from './kraken/render';
import { createKayak } from './kayak/render';
import { PAPER_ON_DARK, withCredit } from './credit';

/**
 * Dev-only promo video page, 1080x1920. Every short is a seamless loop.
 * ?short= picks one: chain (the food-chain loop, the default), bigger
 * ("there's always a bigger fish"), depth ("how deep do fish live?"), birds
 * ("some fish eat birds"), light ("there is a light, anglerfish"), or one of
 * the narrated explainers: mates (male anglerfish fuse to females), blobfish
 * (what it really looks like), greenland (the 400-year-old shark), barreleye
 * (the see-through head), oarfish (the "doomsday fish"), coelacanth (back
 * from extinction), fangtooth (the biggest teeth for its size) or clownfish
 * (Nemo's dad should have become his mom), parrotfish (white sand is fish
 * poop), cusk (the faceless fish), puffer (it can kill thirty people), gulper
 * (a mouth bigger than its body), flyingfish (the 45-second flight) or
 * blackdragon (blacker than black). revenge ("remember this perch") is a
 * gameplay highlight: level 1's growth ladder, ending on the perch that hunted you.
 * More gameplay highlights, one moment of the game each: spat, inkcloud, bait,
 * frenzy, gape and leap (their story.ts files say which).
 * Narrated with a directed voice and a quiet "InkFish · 16bit.ink" credit
 * after the payoff (credit.ts): wrasse (passes the mirror test), tuna (the
 * $3.1M bluefin), pipefish (dads get pregnant), lionfish (eat it to save the
 * reef), moray (its second jaw), tripod (stands on stilts) and trees (sharks
 * are older than trees). The batch of 2026-10-16, myth-busters and known
 * references: goldfish (no three-second memory), surfer (you look like a
 * seal), drown (fish can drown), eels (Freud and the eel riddle), swordfish
 * (heated eyes), grouper (fish can point) and sharkskin (covered in teeth).
 * The batch of 2026-10-18, built on the two breakouts (one giant mouth or a
 * violent action in frame 1, on dark water): goliath (a grouper swallows a
 * shark in one bite), swallower (a fish four times its length inside it), mako
 * (it can jump into your boat), pistol (a snap almost as hot as the sun) and
 * slurp (gameplay: "how did that fit" 2, the viperfish slurps a gulper eel).
 * lure (gameplay: "how did that fit" 3, the viperfish swallows an anglerfish, lure last).
 * axolotl (it can grow back its own legs) is an emotional rollercoaster: a new
 * mood every sentence, in picture, colour and sound.
 * So is dragon (the blue dragon, a tiny slug that eats the man o' war and
 * steals its stingers).
 * frogfish (it eats faster than you can blink) too: frame 1 is the gulp.
 * kraken (the real Kraken: a sperm whale with a giant squid in its jaws) too.
 * The batch of 2026-10-25, from the export of that day (the narrated swallow
 * and the giant mouth won): alpha (something ate a great white shark: Shark
 * Alpha, 2003), octopus (the giant octopuses that ate the aquarium's sharks),
 * bluewhale (a blue whale's mouthful is bigger than its body), leatherback
 * (the leatherback's spiked throat), fringehead (sarcastic fringeheads fight
 * mouth to mouth), cookiecutter (the tiny shark that bit submarines),
 * sheepshead (the fish with human teeth).
 * The batch of 2026-10-26 (seven more narrated swallows, two body-part tests):
 * wreckfish (a wreckfish swallows a dogfish shark whole, 1,500 ft down),
 * eelescape (swallowed eels escape out through the gills), orcawhale (an
 * orca swims into a blue whale's mouth for its tongue), conesnail (a snail
 * that swallows fish whole), wobbegong (a carpet shark swallows a 3-ft shark),
 * stargazer (the fish in the sand that eats whatever swims over it),
 * orcaliver (orcas eat only a great white's liver), bobbit (a worm whose jaws
 * can slice a fish in half), seastar (a starfish eats with its stomach outside its body).
 * The batch of 2026-10-31, from that day's export (whales, size contrast and a
 * twist inside the swallow won): brydes (a Bryde's whale opens its mouth at
 * the surface and waits for the fish to drift in), diver (a Cape Cod diver
 * spent about forty seconds inside a humpback's mouth), seal (a young Cape fur
 * seal hunts blue sharks: the prey becomes the predator).
 * The batch of 2026-11-01: sealion (a humpback catches a sea lion in its
 * mouth by mistake, and it slips out), leopard (a leopard seal brings Paul
 * Nicklen penguins for four days), croc (Brutus the saltwater crocodile eats a
 * bull shark), orcasave (a humpback lifts a seal out of the water, away from orcas).
 * The batch of 2026-11-03: polarshark (the slowest shark had part of a young
 * polar bear's jaw in its stomach), echidna (a tiger shark coughs up a whole
 * echidna while being tagged), hagfish (a hagfish slimes a shark's gills and
 * the shark lets go).
 * The batch of 2026-11-04: orcastomach (the remains of 13 porpoises and 14
 * seals in one orca's stomach, Denmark 1861), alvin (a swordfish stabs the
 * submersible Alvin, 1967), pigeons (wels catfish lunge onto gravel to take
 * pigeons, Albi).
 * orcaflip (orcas flip juvenile whale sharks belly-up, Gulf of California, 2024).
 * gulpshark (gameplay: the viperfish swallows a reef shark).
 * gulpsquid (gameplay: the viperfish swallows a giant squid).
 * gulpsword (gameplay: the viperfish swallows a swordfish, the sword last).
 * gulppuffer (gameplay: a pufferfish inflates inside the viperfish).
 * gulpgiant (gameplay: the viperfish swallows a giant sleeper shark).
 * gulpoar (gameplay: the viperfish slurps down a whole oarfish).
 * pelican (a zoo pelican in Japan tries to swallow a baby capybara).
 * ospreyshark (an osprey carries a shark that has a fish in its mouth, Florida 2018).
 * They're loaded lazily (import() on demand).
 * Plays live; ?t=4.2 freezes one moment. For the chain, ?captions adds the
 * ad text, ?hook=some+words a viral-style hook line instead, and ?debug
 * shows the chain maths. `pnpm promo` (dev/promo/record.mjs) drives
 * window.promo frame by frame to make the video files.
 */
const canvas = document.getElementById('promo') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';
const params = new URLSearchParams(location.search);

async function loadCaptionFont(): Promise<void> {
  await Promise.all([700, 500].map((w) => document.fonts.load(`${w} 92px ${CAPTION_FONT}`)));
  // Without the font the captions would quietly fall back to a system face.
  if (![700, 500].every((w) => document.fonts.check(`${w} 92px ${CAPTION_FONT}`))) throw new Error(`${CAPTION_FONT} font did not load`);
}

async function createChain(): Promise<Short> {
  const debug = params.has('debug');
  const hook = params.get('hook');
  const captions: CaptionSet | null = hook ? { kind: 'hook', text: hook } : params.has('captions') ? { kind: 'ad' } : null;
  if (captions) await loadCaptionFont();
  const sprites = new Map(CHAIN.map((shape) => [shape, makeSprite(shape)] as const));
  const renderer = createRenderer(ctx, sprites);
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      renderer.draw(seconds);
      if (captions) drawCaptions(ctx, captions);
      if (debug) drawDebug(ctx, seconds);
    },
    audio: renderAudio,
  };
}

const SHORTS: Readonly<Record<string, () => Promise<Short>>> = {
  chain: createChain,
  bigger: async () => {
    await loadCaptionFont();
    return createBiggerFish(ctx);
  },
  depth: async () => {
    await loadCaptionFont();
    return createDepth(ctx);
  },
  birds: async () => {
    await loadCaptionFont();
    return createBirds(ctx);
  },
  light: async () => {
    await loadCaptionFont();
    return createLight(ctx);
  },
  mates: async () => {
    await loadCaptionFont();
    return createMates(ctx);
  },
  blobfish: async () => {
    await loadCaptionFont();
    return createBlobfish(ctx);
  },
  greenland: async () => {
    await loadCaptionFont();
    return createGreenland(ctx);
  },
  barreleye: async () => {
    await loadCaptionFont();
    return createBarreleye(ctx);
  },
  oarfish: async () => {
    await loadCaptionFont();
    return createOarfish(ctx);
  },
  coelacanth: async () => {
    await loadCaptionFont();
    return createCoelacanth(ctx);
  },
  fangtooth: async () => {
    await loadCaptionFont();
    return createFangtooth(ctx);
  },
  clownfish: async () => {
    await loadCaptionFont();
    return createClownfish(ctx);
  },
  parrotfish: async () => {
    await loadCaptionFont();
    return createParrotfish(ctx);
  },
  cusk: async () => {
    await loadCaptionFont();
    return createCusk(ctx);
  },
  puffer: async () => {
    await loadCaptionFont();
    return createPuffer(ctx);
  },
  gulper: async () => {
    await loadCaptionFont();
    return createGulper(ctx);
  },
  flyingfish: async () => {
    await loadCaptionFont();
    return createFlyingFish(ctx);
  },
  blackdragon: async () => {
    await loadCaptionFont();
    return createBlackdragon(ctx);
  },
  revenge: async () => {
    await loadCaptionFont();
    return createRevenge(ctx);
  },
  spat: async () => {
    await loadCaptionFont();
    return createSpat(ctx);
  },
  inkcloud: async () => {
    await loadCaptionFont();
    return createInkCloud(ctx);
  },
  bait: async () => {
    await loadCaptionFont();
    return createBait(ctx);
  },
  frenzy: async () => {
    await loadCaptionFont();
    return createFrenzy(ctx);
  },
  gape: async () => {
    await loadCaptionFont();
    return createGape(ctx);
  },
  leap: async () => {
    await loadCaptionFont();
    return createLeap(ctx);
  },
  wrasse: async () => {
    await loadCaptionFont();
    return withCredit(createWrasse(ctx), ctx);
  },
  tuna: async () => {
    await loadCaptionFont();
    return withCredit(createTuna(ctx), ctx);
  },
  pipefish: async () => {
    await loadCaptionFont();
    return withCredit(createPipefish(ctx), ctx);
  },
  lionfish: async () => {
    await loadCaptionFont();
    return withCredit(createLionfish(ctx), ctx);
  },
  moray: async () => {
    await loadCaptionFont();
    return withCredit(createMoray(ctx), ctx);
  },
  tripod: async () => {
    await loadCaptionFont();
    return withCredit(createTripod(ctx), ctx, PAPER_ON_DARK);
  },
  trees: async () => {
    await loadCaptionFont();
    return withCredit(createTrees(ctx), ctx);
  },
  goldfish: async () => {
    await loadCaptionFont();
    return withCredit(createGoldfish(ctx), ctx);
  },
  surfer: async () => {
    await loadCaptionFont();
    return withCredit(createSurfer(ctx), ctx);
  },
  drown: async () => {
    await loadCaptionFont();
    return withCredit(createDrown(ctx), ctx);
  },
  eels: async () => {
    await loadCaptionFont();
    return withCredit(createEels(ctx), ctx);
  },
  swordfish: async () => {
    await loadCaptionFont();
    return withCredit(createSwordfish(ctx), ctx);
  },
  grouper: async () => {
    await loadCaptionFont();
    return withCredit(createGrouper(ctx), ctx);
  },
  sharkskin: async () => {
    await loadCaptionFont();
    return withCredit(createSharkSkin(ctx), ctx);
  },
  goliath: async () => {
    await loadCaptionFont();
    return withCredit(createGoliath(ctx), ctx, PAPER_ON_DARK);
  },
  swallower: async () => {
    await loadCaptionFont();
    return withCredit(createSwallower(ctx), ctx, PAPER_ON_DARK);
  },
  mako: async () => {
    await loadCaptionFont();
    return withCredit(createMako(ctx), ctx, PAPER_ON_DARK);
  },
  pistol: async () => {
    await loadCaptionFont();
    return withCredit(createPistol(ctx), ctx, PAPER_ON_DARK);
  },
  slurp: async () => {
    await loadCaptionFont();
    return createSlurp(ctx);
  },
  lure: async () => {
    await loadCaptionFont();
    return createLure(ctx);
  },
  axolotl: async () => {
    await loadCaptionFont();
    return withCredit(createAxolotl(ctx), ctx, PAPER_ON_DARK);
  },
  dragon: async () => {
    await loadCaptionFont();
    return withCredit(createDragon(ctx), ctx, PAPER_ON_DARK);
  },
  frogfish: async () => {
    await loadCaptionFont();
    return withCredit(createFrogfish(ctx), ctx, PAPER_ON_DARK);
  },
  tigershark: async () => {
    await loadCaptionFont();
    return withCredit(createTigerShark(ctx), ctx, PAPER_ON_DARK);
  },
  kraken: async () => {
    await loadCaptionFont();
    return withCredit(createKraken(ctx), ctx, PAPER_ON_DARK);
  },
  kayak: async () => {
    await loadCaptionFont();
    return withCredit(createKayak(ctx), ctx, PAPER_ON_DARK);
  },
  alpha: async () => {
    await loadCaptionFont();
    const { createAlpha } = await import('./alpha/render');
    return withCredit(createAlpha(ctx), ctx, PAPER_ON_DARK);
  },
  octopus: async () => {
    await loadCaptionFont();
    const { createOctopus } = await import('./octopus/render');
    return withCredit(createOctopus(ctx), ctx, PAPER_ON_DARK);
  },
  bluewhale: async () => {
    await loadCaptionFont();
    const { createBlueWhale } = await import('./bluewhale/render');
    return withCredit(createBlueWhale(ctx), ctx, PAPER_ON_DARK);
  },
  leatherback: async () => {
    await loadCaptionFont();
    const { createLeatherback } = await import('./leatherback/render');
    return withCredit(createLeatherback(ctx), ctx, PAPER_ON_DARK);
  },
  fringehead: async () => {
    await loadCaptionFont();
    const { createFringehead } = await import('./fringehead/render');
    return withCredit(createFringehead(ctx), ctx, PAPER_ON_DARK);
  },
  cookiecutter: async () => {
    await loadCaptionFont();
    const { createCookiecutter } = await import('./cookiecutter/render');
    return withCredit(createCookiecutter(ctx), ctx, PAPER_ON_DARK);
  },
  sheepshead: async () => {
    await loadCaptionFont();
    const { createSheepshead } = await import('./sheepshead/render');
    return withCredit(createSheepshead(ctx), ctx, PAPER_ON_DARK);
  },
  wreckfish: async () => {
    await loadCaptionFont();
    const { createWreckfish } = await import('./wreckfish/render');
    return withCredit(createWreckfish(ctx), ctx, PAPER_ON_DARK);
  },
  eelescape: async () => {
    await loadCaptionFont();
    const { createEelescape } = await import('./eelescape/render');
    return withCredit(createEelescape(ctx), ctx, PAPER_ON_DARK);
  },
  orcawhale: async () => {
    await loadCaptionFont();
    const { createOrcawhale } = await import('./orcawhale/render');
    return withCredit(createOrcawhale(ctx), ctx, PAPER_ON_DARK);
  },
  conesnail: async () => {
    await loadCaptionFont();
    const { createConesnail } = await import('./conesnail/render');
    return withCredit(createConesnail(ctx), ctx, PAPER_ON_DARK);
  },
  wobbegong: async () => {
    await loadCaptionFont();
    const { createWobbegong } = await import('./wobbegong/render');
    return withCredit(createWobbegong(ctx), ctx, PAPER_ON_DARK);
  },
  stargazer: async () => {
    await loadCaptionFont();
    const { createStargazer } = await import('./stargazer/render');
    return withCredit(createStargazer(ctx), ctx, PAPER_ON_DARK);
  },
  brydes: async () => {
    await loadCaptionFont();
    const { createBrydes } = await import('./brydes/render');
    return withCredit(createBrydes(ctx), ctx, PAPER_ON_DARK);
  },
  diver: async () => {
    await loadCaptionFont();
    const { createDiver } = await import('./diver/render');
    return withCredit(createDiver(ctx), ctx, PAPER_ON_DARK);
  },
  seal: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./seal/kit')).createSealKit(ctx);
    const { createSeal } = await import('./seal/render');
    return withCredit(createSeal(ctx), ctx, PAPER_ON_DARK);
  },
  sealion: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./sealion/kit')).createSealionKit(ctx);
    const { createSealion } = await import('./sealion/render');
    return withCredit(createSealion(ctx), ctx, PAPER_ON_DARK);
  },
  leopard: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./leopard/kit')).createLeopardKit(ctx);
    const { createLeopard } = await import('./leopard/render');
    return withCredit(createLeopard(ctx), ctx, PAPER_ON_DARK);
  },
  croc: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./croc/kit')).createCrocKit(ctx);
    const { createCroc } = await import('./croc/render');
    return withCredit(createCroc(ctx), ctx, PAPER_ON_DARK);
  },
  orcasave: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./orcasave/kit')).createOrcasaveKit(ctx);
    const { createOrcasave } = await import('./orcasave/render');
    return withCredit(createOrcasave(ctx), ctx, PAPER_ON_DARK);
  },
  polarshark: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./polarshark/kit')).createPolarsharkKit(ctx);
    const { createPolarshark } = await import('./polarshark/render');
    return withCredit(createPolarshark(ctx), ctx, PAPER_ON_DARK);
  },
  echidna: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./echidna/kit')).createEchidnaKit(ctx);
    const { createEchidna } = await import('./echidna/render');
    return withCredit(createEchidna(ctx), ctx, PAPER_ON_DARK);
  },
  hagfish: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./hagfish/kit')).createHagfishKit(ctx);
    const { createHagfish } = await import('./hagfish/render');
    return withCredit(createHagfish(ctx), ctx, PAPER_ON_DARK);
  },
  orcastomach: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./orcastomach/kit')).createOrcastomachKit(ctx);
    const { createOrcastomach } = await import('./orcastomach/render');
    return withCredit(createOrcastomach(ctx), ctx, PAPER_ON_DARK);
  },
  alvin: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./alvin/kit')).createAlvinKit(ctx);
    const { createAlvin } = await import('./alvin/render');
    return withCredit(createAlvin(ctx), ctx, PAPER_ON_DARK);
  },
  pigeons: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./pigeons/kit')).createPigeonsKit(ctx);
    const { createPigeons } = await import('./pigeons/render');
    return withCredit(createPigeons(ctx), ctx, PAPER_ON_DARK);
  },
  gulpshark: async () => {
    await loadCaptionFont();
    const { createGulpShark } = await import('./gulpshark/render');
    return createGulpShark(ctx);
  },
  gulpsquid: async () => {
    await loadCaptionFont();
    const { createGulpSquid } = await import('./gulpsquid/render');
    return createGulpSquid(ctx);
  },
  gulpsword: async () => {
    await loadCaptionFont();
    const { createGulpSword } = await import('./gulpsword/render');
    return createGulpSword(ctx);
  },
  gulppuffer: async () => {
    await loadCaptionFont();
    const { createGulpPuffer } = await import('./gulppuffer/render');
    return createGulpPuffer(ctx);
  },
  gulpgiant: async () => {
    await loadCaptionFont();
    const { createGulpGiant } = await import('./gulpgiant/render');
    return createGulpGiant(ctx);
  },
  gulpoar: async () => {
    await loadCaptionFont();
    const { createGulpOar } = await import('./gulpoar/render');
    return createGulpOar(ctx);
  },
  pelican: async () => {
    await loadCaptionFont();
    const { createPelican } = await import('./pelican/render');
    return withCredit(createPelican(ctx), ctx);
  },
  ospreyshark: async () => {
    await loadCaptionFont();
    const { createOspreyShark } = await import('./ospreyshark/render');
    return withCredit(createOspreyShark(ctx), ctx);
  },
  orcaflip: async () => {
    await loadCaptionFont();
    if (params.has('kit')) return (await import('./orcaflip/kit')).createOrcaflipKit(ctx);
    const { createOrcaflip } = await import('./orcaflip/render');
    return withCredit(createOrcaflip(ctx), ctx, PAPER_ON_DARK);
  },
  orcaliver: async () => {
    await loadCaptionFont();
    const { createOrcaliver } = await import('./orcaliver/render');
    return withCredit(createOrcaliver(ctx), ctx, PAPER_ON_DARK);
  },
  bobbit: async () => {
    await loadCaptionFont();
    const { createBobbit } = await import('./bobbit/render');
    return withCredit(createBobbit(ctx), ctx, PAPER_ON_DARK);
  },
  seastar: async () => {
    await loadCaptionFont();
    const { createSeastar } = await import('./seastar/render');
    return withCredit(createSeastar(ctx), ctx, PAPER_ON_DARK);
  },
};

const name = params.get('short') ?? 'chain';
const make = SHORTS[name];
if (!make) throw new Error(`Unknown short "${name}": use one of ${Object.keys(SHORTS).join(', ')}`);
const short = await make();

/** The soundtrack as base64 WAV, for the recorder, starting `start` seconds into the loop. */
async function audioBase64(start = 0): Promise<string> {
  const bytes = new Uint8Array(await (await short.audio(start)).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

declare global {
  interface Window {
    promo: {
      readonly loopSeconds: number;
      draw(seconds: number): void;
      audioBase64(start?: number): Promise<string>;
    };
  }
}
window.promo = { loopSeconds: short.loopSeconds, draw: (s) => short.draw(s), audioBase64 };

const frozen = params.get('t');
if (frozen !== null) short.draw(Number(frozen));
else if (!params.has('record')) {
  const start = performance.now();
  const tick = (now: number): void => {
    short.draw(((now - start) / 1000) % short.loopSeconds);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
