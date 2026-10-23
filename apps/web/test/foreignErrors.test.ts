import { describe, expect, it } from 'vitest';
import { isForeignError } from '../src/lib/foreignErrors';

describe('isForeignError', () => {
  it('drops what in-app browsers inject into our pages', () => {
    expect(isForeignError({ error: 'Uncaught Error: Error invoking postMessage: Java object is gone', source: 'navigation_performance_logger_android' })).toBe(true);
    expect(isForeignError({ error: 'Uncaught SyntaxError: Unexpected end of input', source: 'browser_declutter' })).toBe(true);
    expect(isForeignError({ error: "ReferenceError: Can't find variable: _AutofillCallbackHandler", source: '/:1:25' })).toBe(true);
    expect(isForeignError({ error: "TypeError: null is not an object (evaluating 'e.contentWindow.postMessage')", source: '/:37:16115' })).toBe(true);
  });

  it("drops another origin's script error, which the browser leaves without a message", () => {
    expect(isForeignError({ error: 'Script error.' })).toBe(true);
    expect(isForeignError({ error: 'Script error.', source: 'cdn.example' })).toBe(true);
  });

  it('keeps errors from our own scripts and from other sites', () => {
    expect(isForeignError({ error: 'Uncaught Error: Link Shader failed:', source: '/_astro/phaser.esm.kjW-8Git.js:97:46' })).toBe(false);
    expect(isForeignError({ error: 'TypeError: Fullscreen is not supported' })).toBe(false);
    expect(isForeignError({ error: 'TypeError: x is undefined', source: 'cdn.example' })).toBe(false);
  });
});
