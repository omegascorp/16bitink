// Writes the fifth long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/swallow/saveSrt.mjs   -> promo/longform/5 - biggest thing a snake can swallow.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('swallow', '5 - biggest thing a snake can swallow.srt');
