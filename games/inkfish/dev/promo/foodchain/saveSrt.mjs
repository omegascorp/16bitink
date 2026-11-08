// Writes the second long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/foodchain/saveSrt.mjs   -> promo/longform/2 - fish eat fish size comparison.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('foodchain', '2 - fish eat fish size comparison.srt');
