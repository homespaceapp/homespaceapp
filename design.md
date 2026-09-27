# DESIGN SYSTEM — Loszki App

> Status: IMPLEMENTED
> Ostatnia aktualizacja: 2026-09-27
> Właściciel kierunku: Adrian / @coo
> Zakres bieżącej zmiany: kalendarz — przewidywany okres

## 1. Cel i odbiorca

- Produkt: prywatna aplikacja domowa Adriana i Kasi.
- Główni użytkownicy: Adrian i Kasia, najczęściej na telefonie/PWA.
- Zadanie kalendarza: szybko pokazać wydarzenia, zapisany cykl oraz jawnie odróżnione prognozy.
- Pożądane odczucie: prosto, spokojnie, czytelnie i bez udawania pewności danych.
- Zasada nadrzędna: zachowujemy obecny język wizualny; prognoza nigdy nie wygląda jak fakt.

## 2. Referencje i lekki prototyp

| Źródło | Co wykorzystujemy | Czego nie kopiujemy |
|---|---|---|
| Istniejący `/kalendarz` | zielone CTA, karty `rounded-xl`, mała typografia i układ mobile-first | nie zmieniamy nawigacji ani identyfikacji aplikacji |
| [ACOG — Your First Period](https://www.acog.org/womens-health/faqs/your-first-period) | cykl liczony od pierwszego dnia krwawienia do pierwszego dnia kolejnego okresu | nie kopiujemy treści medycznych do UI |
| [NHS — Periods and fertility](https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/) | jawna niepewność prognozy i rozróżnienie okresu od okna płodnego | prognoza nie jest poradą medyczną ani antykoncepcją |

Prototyp tekstowy komponentu:

```text
┌ Przewidywany okres ─────────────────────────┐
│ 4–7 paź · za 7 dni                         │
│ Cykl ok. 28 dni · okres ok. 4 dni          │
│ Prognoza na podstawie zapisanej historii.  │
└─────────────────────────────────────────────┘
● zapisany okres  ◌ prognoza  ● dni płodne  ● owulacja
```

## 3. Zasady wizualne

- Zieleń pozostaje kolorem działań i zaznaczenia dnia.
- Róż oznacza okres: pełniejsze tło dla wpisu rzeczywistego, jaśniejsze tło i przerywany znacznik dla prognozy.
- Błękit pozostaje oznaczeniem dni płodnych i owulacji.
- Kolor zawsze ma podpis tekstowy lub wzór, aby informacja nie zależała wyłącznie od barwy.

## 4. Tokeny

### Kolory

| Token Tailwind | Użycie |
|---|---|
| `emerald-500/600` | CTA, dzisiaj, zaznaczenie |
| `rose-100/500/700` | okres zapisany |
| `rose-50/200/600` | przewidywany okres |
| `sky-50/100/600` | dni płodne i owulacja |
| `zinc-50..900` | powierzchnie i tekst |

### Typografia, spacing i motion

- Font: istniejący Arial/Helvetica z `globals.css`.
- Tekst podstawowy: `text-sm`; opisy i legenda: `text-xs`/`text-[11px]`.
- Spacing: istniejąca skala Tailwind 1–6; bez nowych wartości arbitralnych.
- Radius: `rounded-lg`, `rounded-xl` i `rounded-2xl` zgodnie z istniejącymi komponentami.
- Motion: wyłącznie krótkie `transition-colors`/`active:scale-95`.

## 5. Layout i responsywność

- Maksymalna szerokość kalendarza: `max-w-4xl`.
- Mobile 390 px: karta prognozy i legenda zawijają się; przyciski pozostają dotykalne.
- Tablet/desktop: ta sama hierarchia, bez osobnego układu.
- Siatka miesiąca pozostaje siedmiokolumnowa.

## 6. Komponenty i stany

| Komponent | Warianty | Stany | Reguły |
|---|---|---|---|
| Karta prognozy | z historią / fallback 28 dni | brak danych / aktywna prognoza | pokazuje zakres, podstawę i zastrzeżenie |
| Dzień kalendarza | zwykły / okres / prognoza / płodny / owulacja | default/selected/today | okres ma pierwszeństwo tła; selected zachowuje zielony ring |
| Legenda cyklu | 4 znaczniki | zawsze przy danych cyklu | prognoza ma przerywany wzór |
| Przyciski okresu | początek / koniec | default/disabled/loading | działają na wybranym dniu |

## 7. Ekrany

| Ekran | Cel | Główne komponenty | Status |
|---|---|---|---|
| `/kalendarz` miesiąc | wydarzenia i pełny kontekst cyklu | karta prognozy, legenda, siatka | IMPLEMENTED |
| `/kalendarz` tydzień | wydarzenia i znaczniki cyklu w 7 dniach | karta prognozy, oznaczone nagłówki dni | IMPLEMENTED |

## 8. Dostępność

- Prognoza jest nazwana tekstem i oznaczona przerywanym wzorem, nie tylko kolorem.
- Znaczniki mają `title`/`aria-label` tam, gdzie przekazują znaczenie.
- Zachowujemy kontrast tekstu minimum `zinc-600`/`rose-700` na jasnych tłach.
- Przyciski zachowują widoczne stany disabled i natywne focus.

## 9. Zakazy i wyjątki

- Nie przedstawiamy przewidywanej daty jako pewnej.
- Nie używamy prognozy płodności jako metody antykoncepcji.
- Nie zmieniamy stylu pozostałych modułów przy tej poprawce.
- Wyjątek: komponent cyklu wykorzystuje róż i błękit jako semantyczne kolory zdrowotne, ale nadal w istniejącej palecie Tailwind.

## 10. Weryfikacja

- [x] Testy algorytmu: jedna historia, wiele cykli, brak danych i przejście miesiąca/roku
- [x] Build produkcyjny
- [x] Główny flow E2E
- [x] Mobile 390 px
- [x] Desktop 1440 px
- [x] Produkcyjny URL + HTTP
