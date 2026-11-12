// Writes the seventh long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/swallowed/saveSrt.mjs   -> promo/longform/7 - swallowed whole size comparison.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('swallowed', '7 - swallowed whole size comparison.srt');
