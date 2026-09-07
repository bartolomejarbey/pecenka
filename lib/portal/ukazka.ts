import "server-only";

import { jeLokalniDb } from "@/lib/db/client";

/**
 * Smí se ukázkový režim portálu spustit?
 *
 * Obchází přihlášení, takže na ostrá data nesmí. Rozhoduje **databáze, ne
 * `NODE_ENV`**: místní ukázka běží na produkčním buildu (`npm start`), takže
 * podle `NODE_ENV` by se nepustila ani na notebooku, kde je k ničemu jinému
 * než k ukazování. Naostro je `DATABASE_URL` vždycky nastavená, takže se tam
 * ukázka sama od sebe nikdy nezapne.
 *
 * `UKAZKA_PORTALU=1` je vědomé přepnutí pro předváděcí nasazení nad ostrou
 * databází. Kdo si ho nastaví, ví, co dělá.
 */
export const ukazkaPovolena = () => jeLokalniDb() || Boolean(process.env.UKAZKA_PORTALU);
