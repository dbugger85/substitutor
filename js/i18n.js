// English and Norwegian (bokmål). The English text is the key, so the code
// stays readable: tr('Add player') gives "Ny spiller" in Norwegian.
// {name}-style gaps are filled from the second argument.
//
// The language comes from "?lang=no" / "?lang=en" in the address (one address
// per language, for Google), then the coach's choice (the round flag in the top
// bar), then the phone's language. Changing it reloads the page.

const KEY = 'substitutor.lang';

export const NO = {
  // Head and the first screen
  'Substitutor – fair substitutions in kids’ sports': 'Substitutor – rettferdige bytter i barneidrett',
  'Free app for coaches: a countdown to the next substitution, who goes off and who comes on, positions and a field view, so every kid gets fair playing time. Football, bandy, handball, ice hockey, floorball and futsal. Works offline on any phone.':
    'Gratis app for trenere: nedtelling til neste bytte, hvem som skal ut og inn, posisjoner og banevisning, så alle barna får rettferdig spilletid. Fotball, bandy, håndball, ishockey, innebandy og futsal. Virker uten nett på alle mobiler.',
  'Fair playing time for every player': 'Rettferdig spilletid for alle spillerne',
  'Substitutor keeps track of playing time in kids’ matches and tells you who goes off and who comes on, so every player gets fair time on the field. For football, bandy, handball, ice hockey, floorball and futsal. Free, no sign-up, and it works without signal.':
    'Substitutor holder styr på spilletiden i barnekamper og sier fra hvem som skal ut og inn, så alle får like mye tid på banen. For fotball, bandy, håndball, ishockey, innebandy og futsal. Gratis, uten innlogging, og virker uten dekning.',
  Language: 'Språk',
  'Open source – help make it better on GitHub': 'Åpen kildekode – bidra på GitHub',
  'Language: {lang}. Tap for {other}.': 'Språk: {lang}. Trykk for {other}.',
  English: 'English',
  Norsk: 'Norsk',

  // Team
  Players: 'Spillere',
  'Player name': 'Spillernavn',
  Add: 'Legg til',
  'Add the players in your team.': 'Legg til spillerne på laget.',
  'Set up match': 'Sett opp kamp',
  'Share team': 'Del laget',
  'Paste a shared link': 'Lim inn en delt lenke',
  'Install the app': 'Installer appen',
  'Quick to open, works without signal.': 'Rask å åpne, virker uten dekning.',
  Install: 'Installer',
  'Not now': 'Ikke nå',
  'Remove {name}': 'Fjern {name}',
  'Rename player': 'Endre navn',
  Save: 'Lagre',
  'Rename {name}': 'Endre navn på {name}',

  // Setup
  'Match setup': 'Kampoppsett',
  'Players on the field (including goalkeeper)': 'Spillere på banen (med målvakt)',
  Goalkeeper: 'Målvakt',
  'Starting players': 'Startspillere',
  Positions: 'Posisjoner',
  'Give players positions': 'Gi spillerne posisjoner',
  'Field view': 'Banevisning',
  'Swipe left': 'Sveip til venstre',
  'Swipe left to see it': 'Sveip til venstre for å se den',
  'Minutes between substitutions': 'Minutter mellom bytter',
  'Minutes between subs': 'Minutter mellom bytter',
  'Players per substitution': 'Spillere per bytte',
  Back: 'Tilbake',
  'Start match': 'Start kampen',
  'Enter how many players are on the field.': 'Skriv hvor mange spillere som er på banen.',
  'You only have {n} players in the team.': 'Du har bare {n} spillere på laget.',
  'Choose a goalkeeper.': 'Velg en målvakt.',
  'Pick {n} starting players besides the goalkeeper.': 'Velg {n} startspillere i tillegg til målvakten.',
  'Enter the minutes between substitutions.': 'Skriv minutter mellom byttene.',
  'Players per substitution must be between 1 and {n}.': 'Spillere per bytte må være mellom 1 og {n}.',
  '({n} of {total})': '({n} av {total})',
  '✓ Suggested: the players who played least last match start.': '✓ Forslag: de som spilte minst forrige kamp, starter.',
  'Suggest starters from last match': 'Foreslå startspillere fra forrige kamp',
  'Position {n}': 'Posisjon {n}',
  'position {n}': 'posisjon {n}',
  'Name of position {n}': 'Navn på posisjon {n}',
  'Who plays {pos}?': 'Hvem spiller {pos}?',
  Sport: 'Idrett',
  Colour: 'Farge',

  // Match
  'Match settings': 'Kampinnstillinger',
  'Show the list': 'Vis listen',
  'Show the field': 'Vis banen',
  'Restart the countdown': 'Start nedtellingen på nytt',
  'Next substitution': 'Neste bytte',
  'Match time': 'Kamptid',
  PAUSED: 'PAUSE',
  Pause: 'Pause',
  Resume: 'Fortsett',
  Swap: 'Bytt',
  'Add player': 'Ny spiller',
  'On the field': 'På banen',
  Bench: 'Benken',
  'Out of the match': 'Ute av kampen',
  'Minutes show total time played, and in small grey, time since they last came on.':
    'Minuttene viser total spilletid, og med liten grå skrift tiden siden de sist kom inn.',
  'Grey tags on the bench show where they last played.': 'Grå merker på benken viser hvor de spilte sist.',
  'Tap a player for more options.': 'Trykk på en spiller for flere valg.',
  'End match': 'Avslutt kampen',
  'Move to another phone': 'Flytt til en annen mobil',
  'Tip: press and hold a position to move it.': 'Tips: hold inne en posisjon for å flytte den.',
  'Drag the positions where you want them, then tap Done.': 'Dra posisjonene dit du vil ha dem, og trykk Ferdig.',
  Done: 'Ferdig',
  GK: 'MV',
  'Last played': 'Spilte sist',
  'No goalkeeper. Tap a player and choose "Make goalkeeper".': 'Ingen målvakt. Trykk på en spiller og velg «Gjør til målvakt».',
  'Only {n} of {total} players on the field.': 'Bare {n} av {total} spillere på banen.',
  'Substitution time, but nobody is on the bench.': 'Tid for bytte, men ingen sitter på benken.',
  'Countdown restarted: next substitution in {time}.': 'Nedtellingen startet på nytt: neste bytte om {time}.',
  'Nobody on the bench to swap with.': 'Ingen på benken å bytte med.',
  Name: 'Navn',
  '{name} is on the bench and will come on at the next substitution.': '{name} sitter på benken og kommer inn ved neste bytte.',
  'End the match?': 'Avslutte kampen?',
  'The minutes are saved for next match’s starters.': 'Minuttene lagres, så neste kamps startspillere kan foreslås.',
  'From the next substitution.': 'Gjelder fra neste bytte.',
  'Press ↻ to start it now.': 'Trykk ↻ for å starte den nå.',

  // Player options
  'Substitute now': 'Bytt ut nå',
  'Injured – take off': 'Skadet – ta ut',
  'Change position with…': 'Bytt posisjon med…',
  'Who swaps positions with {name}?': 'Hvem bytter posisjon med {name}?',
  'Make goalkeeper': 'Gjør til målvakt',
  'Put on the field': 'Sett inn på banen',
  'Bring on now': 'Sett inn nå',
  'Remove from match': 'Fjern fra kampen',
  'Back to bench': 'Tilbake til benken',
  Rename: 'Endre navn',
  Cancel: 'Avbryt',
  OK: 'OK',

  // Swap popup
  Substitution: 'Bytte',
  'Substitution time!': 'Tid for bytte!',
  'Injury – swap player': 'Skade – bytt spiller',
  'Swap players': 'Bytt spillere',
  'Change a player by tapping their name.': 'Trykk på et navn for å velge en annen spiller.',
  '+ Add another swap': '+ Legg til et bytte til',
  Skip: 'Hopp over',
  'Choose…': 'Velg…',
  'Who comes off?': 'Hvem skal ut?',
  'Who comes on?': 'Hvem skal inn?',
  OFF: 'UT',
  ON: 'INN',
  'Remove this swap': 'Fjern dette byttet',
  'No swaps.': 'Ingen bytter.',
  'Each player can only be picked once.': 'Hver spiller kan bare velges én gang.',

  // Summary
  'Match over': 'Kampen er over',
  'Minutes played:': 'Spilte minutter:',
  'Next match, the players who played least will be suggested to start.': 'Neste kamp blir de som spilte minst, foreslått som startspillere.',
  Close: 'Lukk',

  // Moving to another phone
  'Link copied. Send it to the other phone and open it there.': 'Lenken er kopiert. Send den til den andre mobilen og åpne den der.',
  'Copy this link': 'Kopier denne lenken',
  'Send it to the other phone and open it there.': 'Send den til den andre mobilen og åpne den der.',
  Link: 'Lenke',
  'Copy the link from the other phone and paste it here.': 'Kopier lenken fra den andre mobilen og lim den inn her.',
  'Paste the link here': 'Lim inn lenken her',
  Load: 'Hent',
  'That link doesn’t work. Ask for a new one.': 'Den lenken virker ikke. Be om en ny.',
  'Load the shared team?': 'Hente det delte laget?',
  'This phone’s team and match are replaced by the shared ones. The match carries on from where the other phone is.':
    'Laget og kampen på denne mobilen byttes ut med de delte. Kampen fortsetter der den andre mobilen er.',
  'This phone’s team and match are replaced by the shared team and setup.': 'Laget og kampen på denne mobilen byttes ut med det delte laget og oppsettet.',
  'Match loaded. Carry on from here.': 'Kampen er hentet. Fortsett herfra.',
  'Team loaded.': 'Laget er hentet.',

  // Theme, install
  Auto: 'Auto',
  Light: 'Lys',
  Dark: 'Mørk',
  'Theme: {theme}. Tap to change.': 'Tema: {theme}. Trykk for å bytte.',
  'Install on iPhone': 'Installer på iPhone',
  'Tap the <strong>Share</strong> button <span class="share-icon" aria-hidden="true"></span> in Safari’s toolbar.':
    'Trykk på <strong>Del</strong>-knappen <span class="share-icon" aria-hidden="true"></span> i verktøylinjen i Safari.',
  'Scroll down and tap <strong>Add to Home Screen</strong>.': 'Bla ned og trykk på <strong>Legg til på Hjem-skjerm</strong>.',
  'Tap <strong>Add</strong>. Substitutor is now on your home screen.': 'Trykk på <strong>Legg til</strong>. Nå ligger Substitutor på Hjem-skjermen.',
  'Got it': 'Skjønner',

  // Field view sports and colours (js/pitch.js)
  Football: 'Fotball',
  Bandy: 'Bandy',
  Handball: 'Håndball',
  'Ice hockey': 'Ishockey',
  Floorball: 'Innebandy',
  Futsal: 'Futsal',
  Green: 'Grønn',
  Blue: 'Blå',
  Ice: 'Is',
  Wood: 'Tre',
  Red: 'Rød',
  Purple: 'Lilla',
  Grey: 'Grå',
};

export const LANGS = { en: 'English', no: 'Norsk' };

// Round flags for the language button: drawn, not emoji, so they look the same
// on every phone. The flag's own colours (fixed, not theme colours); the button crops them to a circle.
export const FLAGS = {
  en: `<svg viewBox="15 0 30 30" aria-hidden="true"><path d="M0 0h60v30H0z" fill="#012169"/>
    <path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6"/>
    <path d="M0 0l60 30M60 0L0 30" stroke="#c8102e" stroke-width="2"/>
    <path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/>
    <path d="M30 0v30M0 15h60" stroke="#c8102e" stroke-width="6"/></svg>`,
  no: `<svg viewBox="2 0 16 16" aria-hidden="true"><path d="M0 0h22v16H0z" fill="#ba0c2f"/>
    <path d="M6 0h4v16H6zM0 6h22v4H0z" fill="#fff"/>
    <path d="M7 0h2v16H7zM0 7h22v2H0z" fill="#00205b"/></svg>`,
};

function pick() {
  try {
    const asked = new URLSearchParams(location.search).get('lang');
    if (LANGS[asked]) {
      localStorage.setItem(KEY, asked);
      return asked;
    }
    const saved = localStorage.getItem(KEY);
    if (LANGS[saved]) return saved;
  } catch {}
  const phone = (navigator.languages ?? [navigator.language]).find((l) => /^(en|nb|nn|no)\b/i.test(l ?? ''));
  return /^(nb|nn|no)/i.test(phone ?? '') ? 'no' : 'en';
}

export const lang = typeof location === 'undefined' ? 'en' : pick();

export function tr(text, vars) {
  const s = (lang === 'no' && NO[text]) || text;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}

// The default position names are stored in English ("Position 2"), and shown in the chosen language.
export const posLabel = (name) => {
  if (name === 'GK') return tr('GK');
  const n = /^Position (\d+)$/.exec(name ?? '')?.[1];
  return n ? tr('Position {n}', { n }) : name;
};

// Switch language: save it and reload on that language's own address.
export function setLang(code) {
  try {
    localStorage.setItem(KEY, code);
  } catch {}
  const url = new URL(location.href);
  url.searchParams.set('lang', code);
  location.replace(url);
}

// Translates the page's own text: elements marked data-t (their text),
// data-t-html (their HTML, for a few with bold words), data-t-placeholder and data-t-label.
export function translatePage() {
  document.documentElement.lang = lang === 'no' ? 'nb' : 'en';
  if (lang === 'en') return;
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = tr(e.textContent.trim());
  for (const e of document.querySelectorAll('[data-t-html]')) e.innerHTML = tr(e.innerHTML.trim());
  for (const e of document.querySelectorAll('[data-t-placeholder]')) e.placeholder = tr(e.placeholder);
  for (const e of document.querySelectorAll('[data-t-label]')) e.setAttribute('aria-label', tr(e.getAttribute('aria-label')));
  document.title = tr(document.title);
  const desc = document.querySelector('meta[name="description"]');
  desc.content = tr(desc.content);
  for (const m of document.querySelectorAll('meta[property="og:title"], meta[property="og:description"]')) m.content = tr(m.content);
  document.querySelector('meta[property="og:locale"]').content = 'nb_NO';
  document.querySelector('link[rel="canonical"]').href = 'https://substitutor.no/?lang=no';
}
