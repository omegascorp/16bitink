import { describe, expect, it } from 'vitest';
import { googleCssUrl, selfHostCss } from '../build/fonts';

const CSS = `/* latin-ext */
@font-face {
  font-family: 'Caveat';
  src: url(https://fonts.gstatic.com/s/caveat/v18/AAA.woff2) format('woff2');
}
/* latin */
@font-face {
  font-family: 'Caveat';
  src: url(https://fonts.gstatic.com/s/caveat/v18/BBB.woff2) format('woff2');
}
@font-face {
  font-family: 'Caveat';
  font-weight: 700;
  src: url(https://fonts.gstatic.com/s/caveat/v18/BBB.woff2) format('woff2');
}`;

describe('self-hosted fonts', () => {
  it('points every font at a local file and lists each file once', () => {
    const { css, files } = selfHostCss(CSS);
    expect(css).not.toContain('gstatic');
    expect(css).toContain('url(./fonts/caveat-v18-AAA.woff2)');
    expect(css.match(/caveat-v18-BBB/g)).toHaveLength(2);
    expect(files).toEqual([
      { url: 'https://fonts.gstatic.com/s/caveat/v18/AAA.woff2', fileName: 'fonts/caveat-v18-AAA.woff2' },
      { url: 'https://fonts.gstatic.com/s/caveat/v18/BBB.woff2', fileName: 'fonts/caveat-v18-BBB.woff2' },
    ]);
  });

  it('asks Google for fonts that block until loaded', () => {
    expect(googleCssUrl('family=Caveat:wght@500;700')).toBe('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=block');
  });
});
