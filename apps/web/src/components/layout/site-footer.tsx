import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigazione';
import { COLONNE_FOOTER } from '@/lib/navigazione-sito';
import { percorsi } from '@/content';
import { Container } from './container';
import { Logo } from './logo';

/**
 * Piè di pagina del sito pubblico.
 *
 * Le colonne portano alle pagine che raccontano il prodotto e agli hub di
 * ateneo e argomento. Nessun collegamento a contenuti degli utenti: quelli
 * vivono dietro l'accesso, e il sito non ne espone nemmeno i titoli.
 */
export function SiteFooter() {
  const t = useTranslations('sito');
  const anno = 2026;

  return (
    <footer className="mt-auto bg-superficie-inversa py-14 text-superficie-inversa-tenue">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <Link href={percorsi.home()} aria-label="Prome" className="inline-flex text-superficie-inversa-testo">
              <Logo />
            </Link>
            <p className="mt-3.5 font-display text-[15px] font-extrabold text-superficie-inversa-testo">
              {t('motto1')} <span className="text-primary-500">{t('motto2')}</span>
            </p>
            <p className="mt-2.5 max-w-[250px] text-[12.5px] leading-relaxed text-superficie-inversa-tenue">
              {t('footer.claim')}
            </p>
          </div>

          {COLONNE_FOOTER.map((colonna) => (
            <nav key={colonna.titolo} aria-label={t(`footer.${colonna.titolo}`)}>
              <p className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-superficie-inversa-debole">
                {t(`footer.${colonna.titolo}`)}
              </p>
              <ul className="flex flex-col gap-2.5">
                {colonna.voci.map((voce) => (
                  <li key={voce.chiave}>
                    <Link
                      href={voce.href}
                      className="text-[13px] font-semibold text-superficie-inversa-tenue transition-colors hover:text-primary-500"
                    >
                      {t(`footer.${voce.chiave}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-9 flex flex-col gap-4 border-t border-superficie-inversa-bordo pt-5 text-xs text-superficie-inversa-debole sm:flex-row sm:items-center sm:justify-between">
          <span>{t('footer.diritti', { anno })}</span>
          <span className="flex gap-5">
            <Link href={percorsi.privacy()} className="hover:text-primary-500">
              {t('footer.privacy')}
            </Link>
            <Link href={percorsi.privacy()} className="hover:text-primary-500">
              {t('footer.termini')}
            </Link>
            <Link href={percorsi.privacy()} className="hover:text-primary-500">
              {t('footer.cookie')}
            </Link>
          </span>
        </div>
      </Container>
    </footer>
  );
}
