export type VideoEmbed =
  | { kind: 'youtube' | 'vimeo'; src: string }
  | { kind: 'file'; src: string };

/** Turn a YouTube/Vimeo/direct URL into something we can embed in the page. */
export function videoEmbed(url: string): VideoEmbed | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  const yt =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/i)?.[1] ||
    trimmed.match(/youtube\.com\/shorts\/([\w-]+)/i)?.[1];
  if (yt) return { kind: 'youtube', src: `https://www.youtube.com/embed/${yt}` };

  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i)?.[1];
  if (vimeo) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vimeo}` };

  return { kind: 'file', src: trimmed };
}
