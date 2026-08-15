import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { EsportazioneDatiResponse } from '@prome/contracts';
import { ApiWrappedResponse } from '../../common/decorators';
import { AulaStudioService } from '../aula-studio/aula-studio.service';
import { BachecaService } from '../bacheca/bacheca.service';
import { GruppoService } from '../gruppo/gruppo.service';
import { PortaIdentitaUtente } from '../profilo/porta-identita-utente';
import { ProfiloService } from '../profilo/profilo.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import { EsportazioneDatiDto } from './dtos/esportazione.dto';
import { Utente } from './guardia-accesso';

/**
 * «Scarica i tuoi dati» — la funzione che la privacy policy promette per nome.
 *
 * **La compone la facciata, e non un modulo nuovo**, per non aggiungere un
 * secondo componente autorizzato ad attraversare tutti i contesti: quello è e
 * resta la cancellazione. Qui la facciata fa ciò che le compete — orchestrare
 * — e ogni contesto decide **cosa dei propri dati sia esportabile**, esattamente
 * come decide cosa sia cancellabile.
 *
 * I due elenchi sono lo stesso elenco. Un detentore che sapesse cancellare ma
 * non esportare produrrebbe una copia incompleta che si dichiara completa —
 * difetto invisibile a chi la riceve, perché non ha modo di sapere cosa manca.
 * **A ogni nuovo detentore si aggiornano insieme**: `DETENTORI_CENSITI` in
 * `cancellazione.service.ts` e questo metodo.
 *
 * Nessun evento di misurazione: chi esercita un diritto sui propri dati non è
 * un gesto da contare.
 */
@ApiTags('account')
@Controller('account')
export class EsportazioneController {
  constructor(
    private readonly profilo: ProfiloService,
    private readonly identita: PortaIdentitaUtente,
    private readonly bacheca: BachecaService,
    private readonly gruppi: GruppoService,
    private readonly aule: AulaStudioService,
  ) {}

  @Get('dati')
  @ApiOperation({
    operationId: 'scaricaMieiDati',
    summary: 'Una copia completa dei propri dati, in formato leggibile',
  })
  @ApiWrappedResponse({ type: EsportazioneDatiDto })
  async esporta(@Utente() utente: UtenteDiDominio): Promise<EsportazioneDatiResponse> {
    const [email, profilo, bacheca, gruppi, aule] = await Promise.all([
      this.identita.indirizzoDi(utente.id),
      this.profilo.datiPersonaliDi(utente.id),
      this.bacheca.datiPersonaliDi(utente.id),
      this.gruppi.datiPersonaliDi(utente.id),
      this.aule.datiPersonaliDi(utente.id),
    ]);

    return {
      generataIl: new Date().toISOString(),
      account: { utenteId: utente.id, email },
      // Il profilo può non esserci solo per un difetto (P1 dice che esiste
      // sempre): in quel caso si esporta ciò che c'è invece di rifiutare, che
      // per chi esercita un diritto è la risposta peggiore.
      profilo: profilo ?? {
        nome: null,
        cognome: null,
        universita: null,
        corso: null,
        onboardingCompletato: false,
        impostazioniPrivacy: { contattabilita: 'PRIVATO', visibilita: 'PRIVATO' },
      },
      bacheca,
      gruppi,
      auleStudio: aule,
    } as EsportazioneDatiResponse;
  }
}
