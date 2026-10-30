// Writes the fourth long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/seamonsters/saveSrt.mjs   -> promo/longform/4 - sea monsters size comparison.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('seamonsters', '4 - sea monsters size comparison.srt');
