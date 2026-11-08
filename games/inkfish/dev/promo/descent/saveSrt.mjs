// Writes the first long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/descent/saveSrt.mjs   -> promo/longform/1 - fish get weirder the deeper you go.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('descent', '1 - fish get weirder the deeper you go.srt');
