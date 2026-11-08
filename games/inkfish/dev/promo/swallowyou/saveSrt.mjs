// Writes the third long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/swallowyou/saveSrt.mjs   -> promo/longform/3 - every ocean animal that could swallow you.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('swallowyou', '3 - every ocean animal that could swallow you.srt');
