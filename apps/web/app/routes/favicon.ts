import { redirect } from 'react-router';

/** Certains navigateurs demandent /favicon.ico malgré la balise <link> : on renvoie vers le SVG. */
export const loader = () =>
  redirect('/favicon.svg', { status: 301, headers: { 'Cache-Control': 'public, max-age=86400' } });
