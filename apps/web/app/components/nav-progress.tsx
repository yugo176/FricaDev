import { useNavigation } from 'react-router';

/** Fine barre en haut de l'écran pendant le chargement d'une page (utile en 3G). */
export function NavProgress() {
  const navigation = useNavigation();
  const active = navigation.state !== 'idle';
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-brand-600 transition-transform duration-700 ease-out ${
        active ? 'scale-x-[0.85] opacity-100' : 'scale-x-0 opacity-0'
      }`}
    />
  );
}
