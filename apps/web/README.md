# Prome — web

Sito pubblico e applicazione web di Prome: Next.js App Router, React 19, Tailwind v4, HeroUI v3, next-intl.

Le convenzioni di codice — struttura delle cartelle, contenuti, SEO, componenti — sono in [CLAUDE.md](CLAUDE.md).

## Avvio

```bash
pnpm dev        # sviluppo su http://localhost:3500
pnpm build      # build di produzione (compila prima i pacchetti del monorepo)
pnpm start      # serve la build
pnpm lint       # ESLint
pnpm typecheck  # tipi delle rotte + tsc
```

## Ambiente

| Variabile              | Valore predefinito      | A cosa serve                                          |
| ---------------------- | ----------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_URL_SITO` | `https://prome.app`     | base di URL canonici, sitemap, anteprime e dati strutturati |
| `NEXT_PUBLIC_URL_API`  | `http://localhost:3600` | origine dell'API                                       |
| `BUILD_AUTONOMA`       | —                       | `1` per l'output `standalone` usato dall'immagine Docker |

## Marchio e icone

Il logo di riferimento è `public/logo-prome.svg`; da lì sono derivate tutte le icone:

| File                                | Uso                                                        |
| ----------------------------------- | ---------------------------------------------------------- |
| `src/app/icon.svg`                  | icona del browser sulle schede moderne                      |
| `src/app/favicon.ico`               | 16/32/48 px, browser storici e favicon nei risultati Google  |
| `src/app/apple-icon.png`            | 180 px, schermata iniziale iOS                              |
| `public/icona-192.png`, `-512.png`  | icone del manifest (installazione come app)                  |
| `public/icona-mascherabile-512.png` | variante con margine, ritagliata da Android                  |
| `src/app/[locale]/logo-anteprima.png` | marchio dentro l'anteprima social generata da `opengraph-image.tsx` |

Cambiando il logo vanno rigenerate tutte: sono file statici, nessuno le ricalcola alla build.
