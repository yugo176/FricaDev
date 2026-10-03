import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { Camera, Trash2 } from 'lucide-react';
import { Avatar } from './avatar';
import { Button, FormError } from './ui';

const SIZE = 256;

/**
 * Recadre l'image au carré, la réduit à 256 × 256 et la compresse dans le navigateur
 * (WebP, ~20 Ko) : l'envoi est léger en 3G et le serveur n'a aucun traitement d'image à faire.
 */
async function resizeToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();
  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Certains navigateurs ne savent pas produire du WebP : on se rabat sur JPEG.
  const webp = await toBlob('image/webp', 0.85);
  const blob = webp?.type === 'image/webp' ? webp : await toBlob('image/jpeg', 0.85);
  if (!blob) throw new Error('Compression impossible');
  return blob;
}

export function AvatarUploader({
  name,
  handle,
  avatarUrl,
}: {
  name: string;
  handle: string;
  avatarUrl: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher<{ ok: boolean; error?: string | null; avatarUrl?: string | null }>();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type)) {
      setError('Choisis une image (JPEG, PNG ou WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Image trop lourde (15 Mo maximum avant compression).');
      return;
    }
    try {
      const blob = await resizeToSquare(file);
      setPreview(URL.createObjectURL(blob));
      const form = new FormData();
      form.set('intent', 'avatar');
      form.set('avatar', blob, blob.type === 'image/webp' ? 'avatar.webp' : 'avatar.jpg');
      fetcher.submit(form, { method: 'post', encType: 'multipart/form-data' });
    } catch {
      setError('Impossible de lire cette image. Essaie un autre fichier.');
    }
  }

  const busy = fetcher.state !== 'idle';
  const removing = fetcher.formData?.get('intent') === 'avatar-remove';
  const current = removing ? null : (preview ?? fetcher.data?.avatarUrl ?? avatarUrl);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative rounded-full focus-visible:ring-2"
        aria-label="Changer la photo de profil"
      >
        <Avatar name={name} seed={handle} src={current} size={96} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
          <Camera size={22} aria-hidden />
        </span>
      </button>
      <div className="space-y-2 text-center sm:text-left">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            size="md"
            loading={busy && !removing}
            icon={<Camera size={16} aria-hidden />}
            onClick={() => input.current?.click()}
          >
            {current ? 'Changer la photo' : 'Ajouter une photo'}
          </Button>
          {current && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="avatar-remove" />
              <Button variant="ghost" size="md" icon={<Trash2 size={16} aria-hidden />}>
                Retirer
              </Button>
            </fetcher.Form>
          )}
        </div>
        <p className="text-xs text-stone-500">
          Recadrée au carré et allégée automatiquement avant l’envoi.
        </p>
        <FormError>{error ?? fetcher.data?.error}</FormError>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
