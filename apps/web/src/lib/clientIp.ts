/** The visitor's IP: App Platform's edge sets do-connecting-ip; locally, the socket address. */
export function clientIp(request: Request, fallback: () => string): string {
  const fromEdge = request.headers.get('do-connecting-ip');
  if (fromEdge) return fromEdge;
  try {
    return fallback();
  } catch {
    return 'unknown';
  }
}
