// Writes the sixth long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/bitecomp/saveSrt.mjs   -> promo/longform/6 - bite force comparison.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('bitecomp', '6 - bite force comparison.srt');
