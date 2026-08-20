/**
 * Escapování do HTML e-mailů.
 *
 * Do šablon jdou jména, poznámky a e-maily zadané návštěvníkem webu. Bez
 * escapování stačí do poznámky napsat `<img src=x onerror=…>` a majitel má
 * v inboxu cizí HTML. Do e-mailu se nesmí dostat nic neošetřeného.
 */
const MAPA: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(hodnota: unknown, maxDelka = 2000): string {
  return String(hodnota ?? "")
    .slice(0, maxDelka)
    .replace(/[&<>"']/g, (z) => MAPA[z]);
}

/**
 * Hodnota bezpečná do hlavičky e-mailu (předmět, jméno odesílatele).
 *
 * Zalomení řádku v hlavičce je klasická cesta, jak přidat vlastní `Bcc:`.
 * Nodemailer si sice hlavičky kóduje sám, ale spoléhat se na to nebudeme.
 */
export function hlavicka(hodnota: unknown, maxDelka = 160): string {
  return String(hodnota ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, maxDelka)
    .trim();
}
