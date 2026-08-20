# Loga platebních metod

Stažená oficiální loga pro platební stránku. **Zatím se nikde nepoužívají** —
čekají na zasmluvnění platební brány ComGate. Až brána poběží, dosadí se do
`components/booking/PaymentMethods.tsx`.

| Soubor | Co to je | Zdroj |
|---|---|---|
| `comgate.png` | ComGate — vodorovné logo 848×200 | comgate.eu |
| `applepay-mark.svg` | Apple Pay Mark (RGB, oficiální) | developer.apple.com |
| `gpay-mark-dark.svg` | Google Pay mark — na tmavý podklad | gstatic.com (Google Pay API) |
| `gpay-mark-light.svg` | Google Pay mark — na světlý podklad | gstatic.com (Google Pay API) |
| `gpay-button-cs-dark.svg` | Google Pay tlačítko, česky, tmavé | gstatic.com (Google Pay API) |
| `visa.png` | Visa — bílá varianta (jen na tmavý podklad) | comgate.eu |
| `mastercard.png` | Mastercard — bílá varianta (jen na tmavý podklad) | comgate.eu |

## Pravidla použití — nutno dodržet

Jde o **ochranné známky**. Nesmí se překreslovat, přebarvovat, deformovat ani
skládat do vlastních kompozic.

- **Apple Pay** — Apple Pay Identity Guidelines. Mark musí mít volný prostor
  kolem sebe minimálně 1/10 své výšky, minimální výška 20 px. Nikdy neříkat
  „Apple Pay je přijímán“, správně je „Platba přes Apple Pay“ / „Pay with Apple Pay“.
  V Safari se nativní tlačítko dělá přes `ApplePayButton` / CSS `-apple-pay-button`,
  ne přes tenhle obrázek — obrázek je jen pro výčet přijímaných metod.
- **Google Pay** — Google Pay Brand Guidelines. Tlačítko se má vykreslovat přes
  oficiální Google Pay API (`google-pay/button-element`), tenhle SVG je pro výčet metod.
  Minimální šířka tlačítka 90 px, výška 40 px.
- **ComGate** — v patičce platební stránky musí být uvedeno
  „Platby zajišťuje Comgate Payments, a. s.“ + odkaz na obchodní podmínky a reklamační řád.
- Apple Pay ani Google Pay se **nesmí zobrazovat na zařízení, které je nepodporuje** —
  detekce přes `ApplePaySession.canMakePayments()` a `google.payments.api.isReadyToPay()`.

Visa i Mastercard jsou v bílé variantě — na světlém podkladu zmizí. Platební
stránka je tmavá, takže to sedí; kdyby se dělala světlá varianta, je potřeba
stáhnout barevné verze.

Podrobnosti k implementaci viz `SYSTEM.md`, kapitola 6 (Platební vrstva).
