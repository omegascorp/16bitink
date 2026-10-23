/**
 * Script errors that aren't ours. In-app browsers (Facebook and Instagram,
 * most of the ad traffic) inject their own scripts into every page, and
 * those throw when the app closes the page or tears down its bridge. The
 * site doesn't send them, and the dashboard leaves out the ones sent before.
 */

/** Messages from code that isn't on our pages. */
export const FOREIGN_MESSAGES: readonly RegExp[] = [
  // Android WebView: the app's JavaScript bridge, called after the app let it go.
  /Java object is gone/,
  // A script from another origin: the browser hides what went wrong, and none of ours load from elsewhere.
  /^Script error\.?$/,
  // iOS in-app browsers: their autofill, and their messages to frames. Our pages have neither.
  /_AutofillCallbackHandler/,
  /contentWindow\.postMessage/,
];

/** An injected script goes by a bare name: not a path on our site, nor a host with a dot. */
export const FOREIGN_SOURCE = /^[^/.]+$/;

export function isForeignError(report: { readonly error: string; readonly source?: string }): boolean {
  if (report.source !== undefined && FOREIGN_SOURCE.test(report.source)) return true;
  return FOREIGN_MESSAGES.some((pattern) => pattern.test(report.error));
}
