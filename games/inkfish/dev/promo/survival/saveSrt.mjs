// Writes the eighth long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/survival/saveSrt.mjs   -> promo/longform/8 - survival tournament.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('survival', '8 - survival tournament.srt');
