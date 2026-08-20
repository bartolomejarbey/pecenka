/**
 * Společné rozhraní platebních metod.
 *
 * Existuje proto, že platební brána zatím není zasmluvněná. Web dnes umí
 * QR platbu převodem; až se ComGate podepíše, doplní se tři proměnné do
 * prostředí a metoda naskočí. Žádný přepínač v kódu, žádné code review.
 */

export type IdPoskytovatele = "qr" | "comgate" | "mock";

export type Schopnosti = {
  /** Potvrzení do vteřin (karta), nebo se čeká na výpis z banky. */
  okamzitePotvrzeni: boolean;
  vratky: boolean;
  castecneVratky: boolean;
  /** Předautorizace karty — pro kauci. */
  preautorizace: boolean;
  applePay: boolean;
  googlePay: boolean;
  storno: boolean;
};

export type StavPlatby =
  | "created"
  | "pending"
  | "paid"
  | "partially_paid"
  | "overpaid"
  | "cancelled"
  | "expired"
  | "refunded_partial"
  | "refunded_full";

export type VstupPlatby = {
  /** Id řádku v `payments`. */
  platbaId: string;
  castkaHalere: number;
  variabilniSymbol: string;
  specifickySymbol?: string;
  ucel: "ZALOHA" | "DOPLATEK" | "KAUCE";
  splatnost: Date;
  /** Kód rezervace pro člověka. */
  kodRezervace: string;
  host: { jmeno: string; email: string; telefon?: string };
  /** Kam se má host vrátit po zaplacení. */
  navratovaUrl?: string;
};

export type ZalozenaPlatba = {
  /** Identifikátor u poskytovatele (ComGate transId). */
  transakceId?: string;
  /** Kam přesměrovat hosta. */
  presmerovani?: string;
  /** SPAYD řetězec pro QR platbu. */
  spayd?: string;
  vyprsi: Date;
};

export type VysledekVratky = {
  ok: boolean;
  transakceId?: string;
  zprava?: string;
};

export interface PlatebniMetoda {
  id: IdPoskytovatele;
  /** Jak se metoda jmenuje v rozhraní. */
  nazev: string;
  schopnosti: Schopnosti;
  /** Je metoda použitelná? QR ano vždy, ComGate až po zasmluvnění. */
  dostupna(): boolean;
  zalozPlatbu(vstup: VstupPlatby): Promise<ZalozenaPlatba>;
  zjistiStav(transakceId: string): Promise<StavPlatby>;
  vratPenize?(transakceId: string, castkaHalere: number, refId: string): Promise<VysledekVratky>;
  stornuj?(transakceId: string): Promise<void>;
}
