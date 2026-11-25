# Hintavisa – Pilvipalvelut tehtävä 5

Moninpelinä toimiva hintavisa (React + Vite + TypeScript + Firebase Auth + Firestore).
2–4 pelaajaa arvaa kolmen satunnaisen DummyJSON-tuotteen hinnan. Pisteet: `max(0, 100 - |arvaus - hinta|)`.

**Julkaistu sovellus:** https://viikko-4.web.app

## Käyttöönotto

1. `npm install`
2. Kopioi `.env.example` nimellä `.env.local` ja täytä Firebase-web-sovelluksen arvot.
3. Firebase Console:
   - Authentication → Email/Password päälle
   - Firestore Database → Create database
   - Firestore → Rules: kopioi `firestore.rules`-tiedoston sisältö ja paina Publish
     (tai `firebase deploy --only firestore:rules`)
4. `npm run dev`

Testaa kahdella pelaajalla esim. tavallisessa ja incognito-ikkunassa eri tunnuksilla.

## Rakenne

| Tiedosto | Tehtävä |
|---|---|
| `src/types.ts` | Tietomallit `Player`, `Session`, `Product` |
| `src/gameController.ts` | Pelisäännöt: pisteytys, voittaja, tuotteen haku |
| `src/gameSessionService.ts` | Firestore-operaatiot (transaktiot) ja `onSnapshot`-kuuntelu |
| `src/App.tsx` | Kirjautuminen, aula, odotustila, lopputulokset |
| `src/QuizForm.tsx` | Tuote ja hinnan arvaus |
| `src/RoundResult.tsx` | Kierroksen tulos ja oikea hinta |
| `firestore.rules` | Tietoturvasäännöt |

## Toteutuksen ratkaisuja

- Pelitila on yhdessä dokumentissa `sessions/{pelikoodi}`; kaikki pelaajat kuuntelevat sitä `onSnapshot`illa.
- Liittyminen, arvaus ja kierroksen päättäminen tehdään transaktioissa, joten samanaikaiset
  päivitykset eivät ylikirjoita toisiaan (esim. kaksi pelaajaa liittyy yhtä aikaa viimeiselle paikalle).
- Pelin luoja (host) ohjaa peliä: aloittaa kierrokset ja tallentaa tulokset. Muut voivat
  sääntöjen mukaan muuttaa vain omaa pelaajatietoaan odotustilassa ja omaa arvaustaan kerran.
- Firestoreen ei kirjoiteta `undefined`-arvoja: puuttuva tuote on `null` ja rajapinnan data
  muutetaan ensin tarkistetuksi `Product`-olioksi.
- Tunnettu rajoitus: oikea hinta on session dokumentissa jo kierroksen aikana (näytetään vasta
  tuloksissa). Hinnan saisi joka tapauksessa selville DummyJSONista tuotteen nimellä.
  Jos host sulkee selaimen kesken pelin, peli pysähtyy.

## Komennot

- `npm run dev` – kehityspalvelin
- `npm run build` – tyyppitarkistus + build
- `npm test` – pelisääntöjen testit (`src/gameController.test.ts`)
- `npm run build && firebase deploy --only firestore:rules,hosting` – julkaisu Firebaseen
