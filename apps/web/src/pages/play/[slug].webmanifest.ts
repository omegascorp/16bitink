import type { APIRoute } from 'astro';
import { playableGames, type CatalogGame } from '../../data/games';
import { gameManifest } from '../../lib/manifest';

export function getStaticPaths() {
  return playableGames().map((game) => ({ params: { slug: game.slug }, props: { game } }));
}

export const GET: APIRoute<{ game: CatalogGame }> = ({ props }) =>
  new Response(JSON.stringify(gameManifest(props.game)), { headers: { 'Content-Type': 'application/manifest+json' } });
