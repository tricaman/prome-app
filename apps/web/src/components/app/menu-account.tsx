'use client';

import { useTranslations } from 'next-intl';
import { useEsci } from '@prome/app-core';
import { useLeggiMioProfilo } from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { Avatar, Icona, Menu, VoceMenu } from '@/components/ui';

/**
 * L'angolo dell'account, in alto a destra.
 *
 * Fino al 17 agosto 2026 lì c'era un ritratto e basta — l'unico punto dello
 * schermo che tutti premono cercando account e impostazioni, e l'unico che non
 * faceva niente. Intanto le impostazioni si aprivano da un bottone che esisteva
 * solo sul profilo.
 *
 * Le tre voci sono le stesse della colonna, di proposito: questa non è una
 * seconda navigazione, è la scorciatoia dove la si cerca. **Ed è l'unica strada
 * per le impostazioni sotto i 1024px**, dove `AppSidebar` non viene montata.
 */
export function MenuAccount() {
  const t = useTranslations('app');
  const profilo = useLeggiMioProfilo();
  const { esci, inCorso } = useEsci();

  const nome = [profilo.data?.data.nome, profilo.data?.data.cognome].filter(Boolean).join(' ');
  const studi = [profilo.data?.data.corso?.nome, profilo.data?.data.universita?.nome]
    .filter(Boolean)
    .join(' · ');

  return (
    <Menu
      etichetta={t('account.apri')}
      classNameInnesco="flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 hover:bg-superficie-alt-2"
      innesco={
        <>
          {/* Il ritratto è quello vero: finché il nome non arriva resta il
              segno neutro, perché un nome di ripiego darebbe la faccia di
              qualcun altro invece di un'attesa. */}
          <Avatar nome={nome || '?'} dimensione={42} />
          <Icona nome="giu" dimensione={14} className="text-testo-debole" />
        </>
      }
      intestazione={
        <>
          <p className="truncate text-[13px] font-extrabold text-testo">{nome}</p>
          <p className="truncate text-[11.5px] text-testo-didascalia">{studi}</p>
        </>
      }
    >
      <VoceMenu icona="profilo" etichetta={t('nav.profilo')} href={percorsiApp.profilo()} />
      <VoceMenu
        icona="impostazioni"
        etichetta={t('nav.impostazioni')}
        href={percorsiApp.impostazioni()}
      />
      {/* Uscire resta un gesto, non una destinazione: revoca la sessione sul
          server e svuota l'archivio locale anche se il server non risponde. */}
      <VoceMenu
        icona="esci"
        etichetta={t('nav.esci')}
        onSeleziona={() => void esci()}
        disattivata={inCorso}
      />
    </Menu>
  );
}
