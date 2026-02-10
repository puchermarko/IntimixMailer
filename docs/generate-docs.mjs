import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, '..', 'server', 'package.json'));
const PDFDocument = require('pdfkit');

const fontsDir = path.join(__dirname, '..', 'server', 'fonts');
const outputPath = path.join(__dirname, 'Intimix_Mailer_Dokumentacio.pdf');

const doc = new PDFDocument({ size: 'A4', margin: 60, bufferPages: true });
doc.pipe(fs.createWriteStream(outputPath));

// Register fonts
const notoRegular = path.join(fontsDir, 'NotoSans-Regular.ttf');
const notoBold = path.join(fontsDir, 'NotoSans-Bold.ttf');
if (fs.existsSync(notoRegular)) {
  doc.registerFont('R', notoRegular);
  doc.registerFont('B', fs.existsSync(notoBold) ? notoBold : notoRegular);
} else {
  doc.registerFont('R', 'Helvetica');
  doc.registerFont('B', 'Helvetica-Bold');
}

const M = 60;
const W = doc.page.width - M * 2;
const accent = '#1AA19C';
const dark = '#1a1a2e';
const gray = '#555';
const lightGray = '#888';
let pageNum = 0;

function newPage() {
  if (pageNum > 0) doc.addPage();
  pageNum++;
}

function heading1(text, y) {
  doc.font('B').fontSize(26).fillColor(accent).text(text, M, y || doc.y, { width: W });
  doc.moveDown(0.3);
  const ly = doc.y;
  doc.moveTo(M, ly).lineTo(M + W, ly).strokeColor(accent).lineWidth(2).stroke();
  doc.moveDown(0.8);
}

function heading2(text) {
  if (doc.y > 680) newPage();
  doc.font('B').fontSize(16).fillColor(dark).text(text, M, doc.y, { width: W });
  doc.moveDown(0.3);
}

function heading3(text) {
  if (doc.y > 700) newPage();
  doc.font('B').fontSize(12).fillColor(accent).text(text, M, doc.y, { width: W });
  doc.moveDown(0.2);
}

function para(text) {
  if (doc.y > 720) newPage();
  doc.font('R').fontSize(10).fillColor(gray).text(text, M, doc.y, { width: W, lineGap: 3 });
  doc.moveDown(0.5);
}

function bullet(text) {
  if (doc.y > 720) newPage();
  const bulletX = M + 10;
  doc.font('R').fontSize(10).fillColor(gray);
  doc.text('\u2022  ' + text, bulletX, doc.y, { width: W - 10, lineGap: 2 });
  doc.moveDown(0.15);
}

function scenario(title, steps) {
  if (doc.y > 650) newPage();
  doc.font('B').fontSize(11).fillColor(dark).text(title, M, doc.y, { width: W });
  doc.moveDown(0.3);
  steps.forEach((step, i) => {
    if (doc.y > 720) newPage();
    doc.font('R').fontSize(10).fillColor(gray).text(`${i + 1}. ${step}`, M + 15, doc.y, { width: W - 15, lineGap: 2 });
    doc.moveDown(0.15);
  });
  doc.moveDown(0.5);
}

function spacer(h = 0.5) { doc.moveDown(h); }

// ═══════════════════════════════════════════════════════════
// BORÍTÓ
// ═══════════════════════════════════════════════════════════
newPage();

// Logo if available
const logoPath = path.join(__dirname, '..', 'client', 'public', 'logo-header.png');
if (fs.existsSync(logoPath)) {
  try { doc.image(logoPath, M, 120, { height: 60 }); } catch {}
}

doc.font('B').fontSize(36).fillColor(accent).text('Intimix Mailer', M, 200, { width: W });
doc.font('R').fontSize(16).fillColor(lightGray).text('Komplex \u00fcgyviteli \u00e9s levelez\u0151 rendszer', M, doc.y + 5, { width: W });
doc.moveDown(1.5);
doc.font('R').fontSize(11).fillColor(gray).text('Felhaszn\u00e1l\u00f3i dokument\u00e1ci\u00f3', M, doc.y, { width: W });
doc.font('R').fontSize(10).fillColor(lightGray).text(`Verzi\u00f3: 1.0  |  D\u00e1tum: ${new Date().toLocaleDateString('hu-HU')}`, M, doc.y + 5, { width: W });

doc.moveDown(4);
doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor('#ddd').lineWidth(0.5).stroke();
doc.moveDown(1);
doc.font('R').fontSize(9).fillColor(lightGray).text('Ez a dokumentum az Intimix Mailer webalkalmazas teljes funkcionalitasat mutatja be, reszletes hasznalati utmutatoval es felhasznaloi forgatokonyvekkel.', M, doc.y, { width: W, lineGap: 3 });

// ═══════════════════════════════════════════════════════════
// TARTALOMJEGYZÉK
// ═══════════════════════════════════════════════════════════
newPage();
heading1('Tartalomjegyz\u00e9k');

const toc = [
  '1. Bevezet\u00e9s \u00e9s rendszer\u00e1ttekint\u00e9s',
  '2. Bejelentkez\u00e9s \u00e9s hiteles\u00edt\u00e9s',
  '3. Levelez\u00e9s modul',
  '   3.1 Bej\u00f6v\u0151 levelek',
  '   3.2 Elk\u00fcld\u00f6tt levelek',
  '   3.3 \u00daj lev\u00e9l \u00edr\u00e1sa',
  '   3.4 T\u00f6meges email k\u00fcld\u00e9s',
  '4. Kapcsolatkezel\u0151',
  '   4.1 Kapcsolatok l\u00e9trehoz\u00e1sa \u00e9s szerkeszt\u00e9se',
  '   4.2 Kapcsolat r\u00e9szletes n\u00e9zet',
  '5. \u00c1raj\u00e1nlat kezel\u0151',
  '   5.1 \u00c1raj\u00e1nlat l\u00e9trehoz\u00e1sa',
  '   5.2 PDF gener\u00e1l\u00e1s \u00e9s let\u00f6lt\u00e9s',
  '   5.3 \u00c1raj\u00e1nlat k\u00fcld\u00e9se emailben',
  '6. Email sablonok',
  '   6.1 Be\u00e9p\u00edtett sablonok',
  '   6.2 Egy\u00e9ni sablonok kezel\u00e9se',
  '7. Be\u00e1ll\u00edt\u00e1sok',
  '   7.1 SMTP / IMAP konfigur\u00e1ci\u00f3',
  '   7.2 M\u00e1rka \u00e9s c\u00e9gadatok',
  '   7.3 API kulcsok',
  '   7.4 K\u00f6rnyezeti v\u00e1ltoz\u00f3k',
  '8. API dokument\u00e1ci\u00f3 (k\u00fcls\u0151 integr\u00e1ci\u00f3)',
  '9. Felhaszn\u00e1l\u00f3i forgat\u00f3k\u00f6nyvek',
  '10. Gyakori k\u00e9rd\u00e9sek (GYIK)',
];

toc.forEach(item => {
  doc.font(item.startsWith('   ') ? 'R' : 'B').fontSize(10).fillColor(item.startsWith('   ') ? gray : dark)
    .text(item, M, doc.y, { width: W });
  doc.moveDown(0.2);
});

// ═══════════════════════════════════════════════════════════
// 1. BEVEZETÉS
// ═══════════════════════════════════════════════════════════
newPage();
heading1('1. Bevezet\u00e9s \u00e9s rendszer\u00e1ttekint\u00e9s');

para('Az Intimix Mailer egy modern, webalap\u00fa \u00fcgyviteli \u00e9s levelez\u0151 rendszer, amelyet kis- \u00e9s k\u00f6z\u00e9pv\u00e1llalkoz\u00e1sok sz\u00e1m\u00e1ra tervezt\u00fcnk. A rendszer egyetlen fel\u00fcleten integr\u00e1lja a levelez\u00e9st, kapcsolatkezel\u00e9st, \u00e1raj\u00e1nlat-k\u00e9sz\u00edt\u00e9st \u00e9s az email sablon kezel\u00e9st.');

heading2('F\u0151bb funkci\u00f3k');
bullet('Teljes levelez\u00e9s: bej\u00f6v\u0151 \u00e9s kimen\u0151 levelek IMAP/SMTP integr\u00e1ci\u00f3val');
bullet('Kapcsolatkezel\u0151: \u00fcgyfelek, partnerek nyilv\u00e1ntart\u00e1sa r\u00e9szletes c\u00edmadatokkal');
bullet('\u00c1raj\u00e1nlat kezel\u0151: professzion\u00e1lis PDF \u00e1raj\u00e1nlatok k\u00e9sz\u00edt\u00e9se \u00e9s k\u00fcld\u00e9se');
bullet('Email sablonok: be\u00e9p\u00edtett \u00e9s egy\u00e9ni sablonok HTML szerkeszt\u0151vel');
bullet('T\u00f6meges email k\u00fcld\u00e9s: h\u00edrlev\u00e9l jelleg\u0171 k\u00fcld\u00e9s t\u00f6bb c\u00edmzettnek');
bullet('API integr\u00e1ci\u00f3: REST API k\u00fcls\u0151 rendszerek sz\u00e1m\u00e1ra (pl. webshop, CRM)');
bullet('Testreszabhat\u00f3 m\u00e1rka: log\u00f3, c\u00e9gn\u00e9v, c\u00e9gadatok');

spacer();
heading2('Rendszerk\u00f6vetelm\u00e9nyek');
bullet('Modern b\u00f6ng\u00e9sz\u0151 (Chrome, Firefox, Safari, Edge)');
bullet('Internet kapcsolat');
bullet('SMTP \u00e9s IMAP fi\u00f3k (pl. Gmail, Outlook, saj\u00e1t szerver)');

spacer();
heading2('Technol\u00f3giai h\u00e1tt\u00e9r');
bullet('Frontend: React, TailwindCSS, Lucide ikonok');
bullet('Backend: Node.js, Express, SQLite adatb\u00e1zis');
bullet('PDF: PDFKit k\u00f6nyvt\u00e1r Noto Sans fonttal (teljes magyar \u00e9kezet t\u00e1mogat\u00e1s)');
bullet('Email: Nodemailer (SMTP), ImapFlow (IMAP)');

// ═══════════════════════════════════════════════════════════
// 2. BEJELENTKEZÉS
// ═══════════════════════════════════════════════════════════
newPage();
heading1('2. Bejelentkez\u00e9s \u00e9s hiteles\u00edt\u00e9s');

para('Az alkalmaz\u00e1s haszn\u00e1lat\u00e1hoz bejelentkez\u00e9s sz\u00fcks\u00e9ges. A bejelentkez\u00e9si adatokat a rendszergazda \u00e1ll\u00edtja be a k\u00f6rnyezeti v\u00e1ltoz\u00f3kban (LOGIN_EMAIL \u00e9s LOGIN_PASSWORD).');

heading3('Bejelentkez\u00e9s folyamata');
bullet('Nyissa meg a b\u00f6ng\u00e9sz\u0151ben az alkalmaz\u00e1s URL-j\u00e9t');
bullet('Adja meg az email c\u00edm\u00e9t \u00e9s jelszav\u00e1t');
bullet('Kattintson a "Bejelentkez\u00e9s" gombra');
bullet('Sikeres bejelentkez\u00e9s ut\u00e1n a rendszer a f\u0151 ir\u00e1ny\u00edt\u00f3pultra navig\u00e1l');

spacer();
heading3('Biztons\u00e1g');
para('A rendszer JWT (JSON Web Token) alap\u00fa hiteles\u00edt\u00e9st haszn\u00e1l. A token 24 \u00f3ra ut\u00e1n lej\u00e1r, \u00e9s \u00fajra be kell jelentkezni. A token a b\u00f6ng\u00e9sz\u0151 helyi t\u00e1rol\u00f3j\u00e1ban (localStorage) ker\u00fcl ment\u00e9sre.');

heading3('Kijelentkez\u00e9s');
para('A bal oldali men\u00fc alj\u00e1n tal\u00e1lhat\u00f3 "Kijelentkez\u00e9s" gombbal b\u00e1rmikor kijelentkezhet. A kijelentkez\u00e9s t\u00f6rli a helyi tokent \u00e9s visszair\u00e1ny\u00edt a bejelentkez\u00e9si oldalra.');

// ═══════════════════════════════════════════════════════════
// 3. LEVELEZÉS
// ═══════════════════════════════════════════════════════════
newPage();
heading1('3. Levelez\u00e9s modul');

para('A levelez\u00e9s modul a rendszer k\u00f6zponti funkci\u00f3ja. N\u00e9gy f\u00fcl\u00f6n \u00e9rhet\u0151 el: Bej\u00f6v\u0151, Elk\u00fcld\u00f6tt, \u00daj lev\u00e9l \u00e9s T\u00f6meges k\u00fcld\u00e9s.');

heading2('3.1 Bej\u00f6v\u0151 levelek');
para('A Bej\u00f6v\u0151 f\u00fcl\u00f6n l\u00e1that\u00f3ak az IMAP szerveren l\u00e9v\u0151 bej\u00f6v\u0151 levelek. A rendszer az IMAP protokollon kereszt\u00fcl szinkroniz\u00e1lja a leveleket.');

heading3('Funkci\u00f3k');
bullet('Szinkroniz\u00e1l\u00e1s: A "Szinkroniz\u00e1l\u00e1s" gombbal friss\u00edtheti a bej\u00f6v\u0151 leveleket');
bullet('Keres\u00e9s: T\u00e1rgy vagy felad\u00f3 alapj\u00e1n kereshet a levelek k\u00f6z\u00f6tt');
bullet('Lapoz\u00e1s: 50 lev\u00e9l oldalank\u00e9nt, el\u0151re-h\u00e1tra navig\u00e1ci\u00f3val');
bullet('Lev\u00e9l megtekint\u00e9se: Kattintson egy lev\u00e9lre a r\u00e9szletes n\u00e9zethez');
bullet('V\u00e1lasz \u00edr\u00e1sa: A megnyitott lev\u00e9ln\u00e9l a "V\u00e1lasz" gombbal v\u00e1laszolhat');
bullet('Csatolm\u00e1nyok: Let\u00f6lthet\u0151k a lev\u00e9l r\u00e9szletes n\u00e9zet\u00e9b\u0151l');
bullet('Kapcsolat l\u00e9trehoz\u00e1sa: Ismeretlen felad\u00f3b\u00f3l egy kattint\u00e1ssal kapcsolatot hozhat l\u00e9tre');
bullet('T\u00f6rl\u00e9s: Levelek t\u00f6r\u00f6lhet\u0151k a szem\u00e9tkuka ikonnal');

spacer();
heading2('3.2 Elk\u00fcld\u00f6tt levelek');
para('Az Elk\u00fcld\u00f6tt f\u00fcl\u00f6n a rendszerb\u0151l k\u00fcld\u00f6tt \u00e9s az IMAP szerveren l\u00e9v\u0151 kimen\u0151 levelek l\u00e1that\u00f3ak egyes\u00edtve. A rendszer automatikusan \u00f6sszef\u00e9s\u00fcli a helyi napl\u00f3t az IMAP Sent mapp\u00e1val.');

heading3('Funkci\u00f3k');
bullet('Szinkroniz\u00e1l\u00e1s: IMAP kimen\u0151 mappa friss\u00edt\u00e9se');
bullet('Keres\u00e9s: T\u00e1rgy vagy c\u00edmzett alapj\u00e1n');
bullet('R\u00e9szletes n\u00e9zet: HTML tartalom megjelen\u00edt\u00e9se, csatolm\u00e1nyok');
bullet('Automatikus kapcsolat \u00f6sszeren\u00e9l\u00e9s: A rendszer email c\u00edm alapj\u00e1n \u00f6sszerendeli a leveleket a kapcsolatokkal');

spacer();
heading2('3.3 \u00daj lev\u00e9l \u00edr\u00e1sa');
para('Az \u00daj lev\u00e9l f\u00fcl\u00f6n \u00f6n\u00e1ll\u00f3 emailt k\u00fcldhet b\u00e1rkinek.');

heading3('Mez\u0151k');
bullet('C\u00edmzett (To): K\u00f6telez\u0151 mez\u0151, az email c\u00edm');
bullet('CC / BCC: Opcion\u00e1lis m\u00e1solat c\u00edmzettek');
bullet('T\u00e1rgy: A lev\u00e9l t\u00e1rgya');
bullet('Tartalom: HTML szerkeszt\u0151 a lev\u00e9l sz\u00f6veg\u00e9hez');
bullet('Csatolm\u00e1nyok: Maximum 5 f\u00e1jl csatolhat\u00f3 (drag & drop vagy tall\u00f3z\u00e1s)');
bullet('Sablon v\u00e1laszt\u00e1s: Be\u00e9p\u00edtett vagy egy\u00e9ni sablon bet\u00f6lt\u00e9se');

spacer();
heading2('3.4 T\u00f6meges email k\u00fcld\u00e9s');
para('A T\u00f6meges k\u00fcld\u00e9s f\u00fcl\u00f6n egyszerre t\u00f6bb c\u00edmzettnek k\u00fcldhet emailt. A rendszer egyenk\u00e9nt k\u00fcldi el a leveleket, \u00edgy minden c\u00edmzett k\u00fcl\u00f6n kapja meg.');

heading3('Haszn\u00e1lat');
bullet('V\u00e1lasszon c\u00edmzetteket a kapcsolatok k\u00f6z\u00fcl (jel\u00f6l\u0151n\u00e9gyzetek)');
bullet('Vagy adjon meg manu\u00e1lisan email c\u00edmeket');
bullet('\u00c1ll\u00edtsa be a t\u00e1rgyat \u00e9s a tartalmat (sablon is haszn\u00e1lhat\u00f3)');
bullet('Csatolm\u00e1nyokat is adhat hozz\u00e1');
bullet('A "K\u00fcld\u00e9s" gombbal elindul a t\u00f6meges k\u00fcld\u00e9s');
bullet('A rendszer jelzi az \u00e1llapotot: h\u00e1ny lev\u00e9l k\u00fcld\u00e9se sikeres/sikertelen');

// ═══════════════════════════════════════════════════════════
// 4. KAPCSOLATKEZELŐ
// ═══════════════════════════════════════════════════════════
newPage();
heading1('4. Kapcsolatkezel\u0151');

para('A kapcsolatkezel\u0151 az \u00fcgyfelek, partnerek \u00e9s egy\u00e9b kontaktok nyilv\u00e1ntart\u00e1s\u00e1ra szolg\u00e1l. Minden kapcsolathoz r\u00e9szletes c\u00edmadatok, c\u00e9gadatok \u00e9s email el\u0151zm\u00e9nyek t\u00e1rolhat\u00f3k.');

heading2('4.1 Kapcsolatok l\u00e9trehoz\u00e1sa \u00e9s szerkeszt\u00e9se');

heading3('Alapadatok');
bullet('N\u00e9v (k\u00f6telez\u0151): A kapcsolat teljes neve');
bullet('Email (k\u00f6telez\u0151): Email c\u00edm - egyedinek kell lennie');
bullet('Telefon: Telefonsz\u00e1m');
bullet('Megjegyz\u00e9s: Szabad sz\u00f6veges megjegyz\u00e9s');

heading3('C\u00e9gadatok (opcion\u00e1lis)');
bullet('C\u00e9gn\u00e9v: A kapcsolathoz tartoz\u00f3 c\u00e9g neve');
bullet('Ad\u00f3sz\u00e1m: C\u00e9g ad\u00f3sz\u00e1ma');

heading3('C\u00edm mez\u0151k (opcion\u00e1lis)');
bullet('Utca: Az utca neve');
bullet('H\u00e1zsz\u00e1m: H\u00e1zsz\u00e1m / \u00e9p\u00fclet');
bullet('Ir\u00e1ny\u00edt\u00f3sz\u00e1m: Postai ir\u00e1ny\u00edt\u00f3sz\u00e1m');
bullet('V\u00e1ros: Telep\u00fcl\u00e9s neve');
bullet('Megye: Megye (r\u00e9gi\u00f3)');
bullet('Orsz\u00e1g: Orsz\u00e1g neve');

spacer();
heading2('4.2 Kapcsolat r\u00e9szletes n\u00e9zet');
para('Egy kapcsolatra kattintva megjelenik a r\u00e9szletes n\u00e9zet, amely tartalmazza:');
bullet('A kapcsolat \u00f6sszes adata');
bullet('Elk\u00fcld\u00f6tt levelek list\u00e1ja (helyi + IMAP)');
bullet('Bej\u00f6v\u0151 levelek list\u00e1ja');
bullet('Csatolm\u00e1nyok list\u00e1ja (minden forr\u00e1sb\u00f3l)');
bullet('Statisztik\u00e1k: k\u00fcld\u00f6tt/fogadott levelek sz\u00e1ma, csatolm\u00e1nyok sz\u00e1ma');

// ═══════════════════════════════════════════════════════════
// 5. ÁRAJÁNLAT KEZELŐ
// ═══════════════════════════════════════════════════════════
newPage();
heading1('5. \u00c1raj\u00e1nlat kezel\u0151');

para('Az \u00e1raj\u00e1nlat kezel\u0151 professzion\u00e1lis \u00e1raj\u00e1nlatok k\u00e9sz\u00edt\u00e9s\u00e9re, PDF form\u00e1tumban val\u00f3 let\u00f6lt\u00e9s\u00e9re \u00e9s emailben t\u00f6rt\u00e9n\u0151 k\u00fcld\u00e9s\u00e9re szolg\u00e1l. Minden \u00e1raj\u00e1nlat automatikus sorsz\u00e1mot kap (AJ-\u00c9V-XXXX form\u00e1tumban).');

heading2('5.1 \u00c1raj\u00e1nlat l\u00e9trehoz\u00e1sa');

heading3('\u00c1raj\u00e1nlat adatok');
bullet('\u00c1raj\u00e1nlat neve: Szabadon megadhat\u00f3 c\u00edm (pl. "Weboldal fejleszt\u00e9s")');
bullet('Sorsz\u00e1m: Automatikusan gener\u00e1lt (AJ-2025-0001)');
bullet('\u00c1llapot: Piszkozat, Elk\u00fcldve, Elfogadva, Elutas\u00edtva');

heading3('Vev\u0151 adatok');
para('A vev\u0151 adatait k\u00e9tf\u00e9lek\u00e9ppen adhatja meg:');
bullet('Kapcsolatb\u00f3l: A "Kapcsolatb\u00f3l" gombbal v\u00e1laszthat a megl\u00e9v\u0151 kapcsolatok k\u00f6z\u00fcl. Ilyenkor az \u00f6sszes adat (n\u00e9v, email, telefon, c\u00edm, ad\u00f3sz\u00e1m) automatikusan kit\u00f6lt\u0151dik.');
bullet('Manu\u00e1lisan: K\u00e9zzel is kit\u00f6ltheti az \u00f6sszes mez\u0151t');

heading3('C\u00edm mez\u0151k');
bullet('Utca + H\u00e1zsz\u00e1m');
bullet('Ir\u00e1ny\u00edt\u00f3sz\u00e1m + V\u00e1ros');
bullet('Megye + Orsz\u00e1g');

heading3('Be\u00e1ll\u00edt\u00e1sok');
bullet('P\u00e9nznem: HUF (Forint) vagy EUR (Eur\u00f3)');
bullet('\u00c1FA kulcs: Alapb\u00f3l 27%, de m\u00f3dos\u00edthat\u00f3');
bullet('\u00c9rv\u00e9nyess\u00e9g: D\u00e1tum, ameddig az \u00e1raj\u00e1nlat \u00e9rv\u00e9nyes');
bullet('Megjegyz\u00e9s: Szabad sz\u00f6veges megjegyz\u00e9s');

heading3('T\u00e9telek');
para('Korl\u00e1tlan sz\u00e1m\u00fa t\u00e9tel adhat\u00f3 hozz\u00e1:');
bullet('Megnevez\u00e9s: A t\u00e9tel le\u00edr\u00e1sa');
bullet('Mennyis\u00e9g: Darabsz\u00e1m');
bullet('Egys\u00e9g: pl. db, \u00f3ra, h\u00f3nap');
bullet('Egys\u00e9g\u00e1r: Nett\u00f3 \u00e1r egys\u00e9genk\u00e9nt');
bullet('A rendszer automatikusan sz\u00e1molja: nett\u00f3 \u00f6sszeg, \u00c1FA, brutt\u00f3 \u00f6sszeg');

spacer();
heading2('5.2 PDF gener\u00e1l\u00e1s \u00e9s let\u00f6lt\u00e9s');
para('A mentett \u00e1raj\u00e1nlatn\u00e1l a "PDF" gombbal let\u00f6lthet\u0151 a professzion\u00e1lisan form\u00e1zott PDF dokumentum. A PDF tartalma:');
bullet('C\u00e9g log\u00f3ja (ha be van \u00e1ll\u00edtva)');
bullet('Ki\u00e1ll\u00edt\u00f3 adatai (c\u00e9gn\u00e9v, c\u00edm, ad\u00f3sz\u00e1m, bankadatok)');
bullet('Vev\u0151 adatai (n\u00e9v, c\u00edm, ad\u00f3sz\u00e1m, el\u00e9rhet\u0151s\u00e9gek)');
bullet('T\u00e9telek t\u00e1bl\u00e1zata sorsz\u00e1mmal, mennyis\u00e9ggel, egys\u00e9g\u00e1rral');
bullet('Nett\u00f3 \u00f6sszeg, \u00c1FA, brutt\u00f3 \u00f6sszeg');
bullet('Megjegyz\u00e9sek');
bullet('L\u00e1bl\u00e9c c\u00e9gadatokkal');

spacer();
heading2('5.3 \u00c1raj\u00e1nlat k\u00fcld\u00e9se emailben');
para('A "K\u00fcld\u00e9s" gombbal az \u00e1raj\u00e1nlat emailben elk\u00fcldhet\u0151 a vev\u0151nek. A rendszer automatikusan:');
bullet('Gener\u00e1lja a PDF-et \u00e9s mell\u00e9keli');
bullet('Professzion\u00e1lis email sablont haszn\u00e1l az \u00f6sszegz\u00e9ssel');
bullet('Az \u00e1raj\u00e1nlat \u00e1llapot\u00e1t "Elk\u00fcldve"-re \u00e1ll\u00edtja');

// ═══════════════════════════════════════════════════════════
// 6. EMAIL SABLONOK
// ═══════════════════════════════════════════════════════════
newPage();
heading1('6. Email sablonok');

para('A sablon kezel\u0151 be\u00e9p\u00edtett \u00e9s egy\u00e9ni email sablonokat k\u00edn\u00e1l. A sablonok HTML form\u00e1tum\u00faak \u00e9s v\u00e1ltoz\u00f3kat tartalmazhatnak (pl. {{name}}, {{order_id}}).');

heading2('6.1 Be\u00e9p\u00edtett sablonok');
para('A rendszer t\u00f6bb el\u0151re elk\u00e9sz\u00edtett sablont tartalmaz k\u00fcl\u00f6nb\u00f6z\u0151 kateg\u00f3ri\u00e1kban:');
bullet('Rendel\u00e9s visszaigazol\u00e1s');
bullet('Sz\u00e1ll\u00edt\u00e1si \u00e9rtes\u00edt\u00e9s');
bullet('Csomagk\u00f6vet\u00e9s');
bullet('\u00c9s m\u00e1s \u00fczleti c\u00e9l\u00fa sablonok');

para('A be\u00e9p\u00edtett sablonok nem m\u00f3dos\u00edthat\u00f3k, de a HTML k\u00f3djuk m\u00e1solhat\u00f3 \u00e9s felhaszn\u00e1lhat\u00f3 egy\u00e9ni sablonk\u00e9nt.');

spacer();
heading2('6.2 Egy\u00e9ni sablonok kezel\u00e9se');
para('Saj\u00e1t sablonokat hozhat l\u00e9tre, szerkeszthet \u00e9s t\u00f6r\u00f6lhet.');

heading3('Sablon mez\u0151k');
bullet('N\u00e9v: A sablon megnevez\u00e9se');
bullet('Le\u00edr\u00e1s: R\u00f6vid le\u00edr\u00e1s');
bullet('Kateg\u00f3ria: Csoportos\u00edt\u00e1shoz');
bullet('T\u00e1rgy: Az email t\u00e1rgya (v\u00e1ltoz\u00f3kkal)');
bullet('HTML: A sablon HTML k\u00f3dja');

heading3('V\u00e1ltoz\u00f3k haszn\u00e1lata');
para('A sablonokban {{v\u00e1ltoz\u00f3n\u00e9v}} form\u00e1tumban haszn\u00e1lhat\u00f3k v\u00e1ltoz\u00f3k, amelyeket a k\u00fcld\u00e9skor a rendszer automatikusan kicser\u00e9l:');
bullet('{{name}} - C\u00edmzett neve');
bullet('{{email}} - C\u00edmzett email c\u00edme');
bullet('{{order_id}} - Rendel\u00e9s azonos\u00edt\u00f3');
bullet('{{tracking_number}} - Csomagk\u00f6vet\u00e9si sz\u00e1m');
bullet('B\u00e1rmilyen egy\u00e9ni v\u00e1ltoz\u00f3 defini\u00e1lhat\u00f3');

// ═══════════════════════════════════════════════════════════
// 7. BEÁLLÍTÁSOK
// ═══════════════════════════════════════════════════════════
newPage();
heading1('7. Be\u00e1ll\u00edt\u00e1sok');

para('A Be\u00e1ll\u00edt\u00e1sok oldalon konfigur\u00e1lhat\u00f3 a rendszer minden aspektusa. N\u00e9gy f\u00fcl\u00f6n \u00e9rhet\u0151 el: \u00c1ltal\u00e1nos, API kulcsok, Konfigur\u00e1ci\u00f3, M\u00e1rka.');

heading2('7.1 SMTP / IMAP konfigur\u00e1ci\u00f3');
para('Az \u00c1ltal\u00e1nos f\u00fcl\u00f6n tesztelhet\u0151 az SMTP kapcsolat. A r\u00e9szletes be\u00e1ll\u00edt\u00e1sok a Konfigur\u00e1ci\u00f3 f\u00fcl\u00f6n m\u00f3dos\u00edthat\u00f3k.');

heading3('SMTP be\u00e1ll\u00edt\u00e1sok (kimen\u0151 levelek)');
bullet('SMTP_HOST: SMTP szerver c\u00edme (pl. smtp.gmail.com)');
bullet('SMTP_PORT: Port (587 TLS, 465 SSL)');
bullet('SMTP_USER: Felhaszn\u00e1l\u00f3n\u00e9v / email');
bullet('SMTP_PASS: Jelsz\u00f3 vagy alkalmaz\u00e1sjelsz\u00f3');
bullet('SMTP_FROM_NAME: Felad\u00f3 neve');

heading3('IMAP be\u00e1ll\u00edt\u00e1sok (bej\u00f6v\u0151 levelek)');
bullet('IMAP_HOST: IMAP szerver c\u00edme (pl. imap.gmail.com)');
bullet('IMAP_PORT: Port (\u00e1ltal\u00e1ban 993)');
bullet('IMAP_USER: Felhaszn\u00e1l\u00f3n\u00e9v / email');
bullet('IMAP_PASS: Jelsz\u00f3 vagy alkalmaz\u00e1sjelsz\u00f3');

spacer();
heading2('7.2 M\u00e1rka \u00e9s c\u00e9gadatok');
para('A M\u00e1rka f\u00fcl\u00f6n testreszabhat\u00f3 az alkalmaz\u00e1s megjelen\u00e9se \u00e9s a c\u00e9gadatok.');

heading3('Alkalmaz\u00e1s megjelen\u00e9se');
bullet('Alkalmaz\u00e1s neve: Megjelenik az oldals\u00e1vban \u00e9s a bejelentkez\u00e9si oldalon');
bullet('Alc\u00edm: Az alkalmaz\u00e1s alc\u00edme');
bullet('Log\u00f3: Felt\u00f6lthet\u0151 egy\u00e9ni log\u00f3 (PNG, JPG, SVG, WebP, GIF)');

heading3('C\u00e9gadatok');
para('Ezek az adatok jelennek meg az \u00e1raj\u00e1nlat PDF-ekben:');
bullet('C\u00e9gn\u00e9v, Ad\u00f3sz\u00e1m');
bullet('Email, Telefon');
bullet('C\u00edm (utca, v\u00e1ros, ir\u00e1ny\u00edt\u00f3sz\u00e1m, orsz\u00e1g)');
bullet('Bank neve, IBAN sz\u00e1m');

spacer();
heading2('7.3 API kulcsok');
para('K\u00fcls\u0151 rendszerek (webshop, CRM, stb.) sz\u00e1m\u00e1ra API kulcsokat hozhat l\u00e9tre.');
bullet('L\u00e9trehoz\u00e1s: Adjon nevet a kulcsnak \u00e9s kattintson a "L\u00e9trehoz\u00e1s" gombra');
bullet('A kulcs csak egyszer jelenik meg - m\u00e1solja ki \u00e9s t\u00e1rolja biztons\u00e1gosan');
bullet('Enged\u00e9lyez\u00e9s/Tilt\u00e1s: Kulcsok ideiglenesen letilthat\u00f3k');
bullet('T\u00f6rl\u00e9s: V\u00e9glegesen t\u00f6r\u00f6lhet\u0151 egy kulcs');

spacer();
heading2('7.4 K\u00f6rnyezeti v\u00e1ltoz\u00f3k');
para('A Konfigur\u00e1ci\u00f3 f\u00fcl\u00f6n a .env f\u00e1jl tartalma szerkeszthet\u0151 a webes fel\u00fcleten kereszt\u00fcl. A jelszavak \u00e9s titkos kulcsok maszkolva jelennek meg. V\u00e1ltoztat\u00e1s ut\u00e1n az SMTP/IMAP be\u00e1ll\u00edt\u00e1sokhoz szerver \u00fajraind\u00edt\u00e1s sz\u00fcks\u00e9ges.');

// ═══════════════════════════════════════════════════════════
// 8. API DOKUMENTÁCIÓ
// ═══════════════════════════════════════════════════════════
newPage();
heading1('8. API dokument\u00e1ci\u00f3');

para('Az Intimix Mailer REST API-t biztos\u00edt k\u00fcls\u0151 rendszerek sz\u00e1m\u00e1ra. Az API kulcs az X-Api-Key fejl\u00e9cben vagy api_key query param\u00e9terk\u00e9nt k\u00fcldhet\u0151.');

heading2('Hiteles\u00edt\u00e9s');
bullet('Fejl\u00e9c: X-Api-Key: imx_your_api_key_here');
bullet('Query: ?api_key=imx_your_api_key_here');

heading2('V\u00e9gpontok');

heading3('Sablonok');
bullet('GET /api/v1/templates - \u00d6sszes sablon list\u00e1z\u00e1sa');
bullet('GET /api/v1/templates/:id - Egy sablon lek\u00e9rdez\u00e9se');

heading3('Kapcsolatok');
bullet('GET /api/v1/contacts - Kapcsolatok list\u00e1z\u00e1sa (lapozhat\u00f3, kereshet\u0151)');
bullet('GET /api/v1/contacts/:id - Egy kapcsolat r\u00e9szletei');
bullet('POST /api/v1/contacts - \u00daj kapcsolat l\u00e9trehoz\u00e1sa');
bullet('PUT /api/v1/contacts/:id - Kapcsolat m\u00f3dos\u00edt\u00e1sa');
bullet('DELETE /api/v1/contacts/:id - Kapcsolat t\u00f6rl\u00e9se');

heading3('Email k\u00fcld\u00e9s');
bullet('POST /api/v1/send - Email k\u00fcld\u00e9se (to, subject, html k\u00f6telez\u0151)');
bullet('Opcion\u00e1lis: template_id, variables, cc, bcc');

heading3('P\u00e9lda k\u00e9r\u00e9s (cURL)');
para('curl -X POST https://your-domain.com/api/v1/send \\\n  -H "X-Api-Key: imx_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"to":"customer@example.com","subject":"Rendeles","html":"<h1>Hello</h1>"}\'');

// ═══════════════════════════════════════════════════════════
// 9. FELHASZNÁLÓI FORGATÓKÖNYVEK
// ═══════════════════════════════════════════════════════════
newPage();
heading1('9. Felhaszn\u00e1l\u00f3i forgat\u00f3k\u00f6nyvek');

para('Az al\u00e1bbi forgat\u00f3k\u00f6nyvek bemutatj\u00e1k a rendszer tipikus haszn\u00e1lati m\u00f3djait val\u00f3s \u00fczleti helyzetekben.');

scenario('A) \u00daj \u00fcgyf\u00e9l felv\u00e9tele \u00e9s \u00e1raj\u00e1nlat k\u00fcld\u00e9se', [
  'Navig\u00e1ljon a "Kapcsolatok" men\u00fcpontra',
  'Kattintson az "\u00daj kapcsolat" gombra',
  'T\u00f6ltse ki a nevet, emailt, telefonsz\u00e1mot \u00e9s c\u00edmadatokat',
  'Mentse el a kapcsolatot',
  'Navig\u00e1ljon az "\u00c1raj\u00e1nlatok" men\u00fcpontra',
  'Kattintson az "\u00daj \u00e1raj\u00e1nlat" gombra',
  'Adjon nevet az \u00e1raj\u00e1nlatnak (pl. "Weboldal fejleszt\u00e9s 2025")',
  'Kattintson a "Kapcsolatb\u00f3l" gombra \u00e9s v\u00e1lassza ki az \u00faj \u00fcgyfelet',
  'Az adatok automatikusan kit\u00f6lt\u0151dnek',
  'Adja hozz\u00e1 a t\u00e9teleket (megnevez\u00e9s, mennyis\u00e9g, egys\u00e9g\u00e1r)',
  '\u00c1ll\u00edtsa be a p\u00e9nznemet \u00e9s \u00c1FA kulcsot',
  'Mentse el az \u00e1raj\u00e1nlatot',
  'Kattintson a "PDF" gombra az el\u0151n\u00e9zethez',
  'Kattintson a "K\u00fcld\u00e9s" gombra az email k\u00fcld\u00e9shez',
  'Az \u00e1raj\u00e1nlat \u00e1llapota automatikusan "Elk\u00fcldve" lesz',
]);

scenario('B) T\u00f6meges h\u00edrlev\u00e9l k\u00fcld\u00e9s \u00f6sszes \u00fcgyf\u00e9lnek', [
  'Navig\u00e1ljon a "Levelez\u00e9s" men\u00fcpontra',
  'V\u00e1lassza a "T\u00f6meges k\u00fcld\u00e9s" f\u00fclet',
  'Jel\u00f6lje ki a k\u00edv\u00e1nt c\u00edmzetteket a kapcsolatok k\u00f6z\u00fcl',
  'V\u00e1lasszon egy email sablont (pl. akci\u00f3s h\u00edrlev\u00e9l)',
  'Szerkessze a tartalmat sz\u00fcks\u00e9g szerint',
  'Csatoljon f\u00e1jlokat ha sz\u00fcks\u00e9ges (pl. katal\u00f3gus PDF)',
  'Kattintson a "K\u00fcld\u00e9s" gombra',
  'V\u00e1rja meg am\u00edg a rendszer elk\u00fcldi az \u00f6sszes levelet',
  'Ellen\u0151rizze az eredm\u00e9nyt: h\u00e1ny sikeres/sikertelen',
]);

scenario('C) Bej\u00f6v\u0151 lev\u00e9l megv\u00e1laszol\u00e1sa \u00e9s kapcsolat l\u00e9trehoz\u00e1sa', [
  'Navig\u00e1ljon a "Levelez\u00e9s" men\u00fcpontra (Bej\u00f6v\u0151 f\u00fcl)',
  'Kattintson a "Szinkroniz\u00e1l\u00e1s" gombra a legfrissebb levelek\u00e9rt',
  'Nyissa meg a k\u00edv\u00e1nt levelet',
  'Ha a felad\u00f3 m\u00e9g nem kapcsolat, kattintson a "Kapcsolat l\u00e9trehoz\u00e1sa" gombra',
  'Adja meg a nevet \u00e9s mentse',
  'Kattintson a "V\u00e1lasz" gombra',
  '\u00cdrja meg a v\u00e1laszt \u00e9s k\u00fcldje el',
  'A v\u00e1lasz automatikusan az eredeti lev\u00e9l sz\u00e1l\u00e1hoz kapcsol\u00f3dik',
]);

scenario('D) C\u00e9gadatok be\u00e1ll\u00edt\u00e1sa az \u00e1raj\u00e1nlatokhoz', [
  'Navig\u00e1ljon a "Be\u00e1ll\u00edt\u00e1sok" men\u00fcpontra',
  'V\u00e1lassza a "M\u00e1rka" f\u00fclet',
  'T\u00f6ltse fel a c\u00e9g log\u00f3j\u00e1t (PNG vagy SVG aj\u00e1nlott)',
  'Adja meg a c\u00e9g nev\u00e9t, ad\u00f3sz\u00e1m\u00e1t, el\u00e9rhet\u0151s\u00e9geit',
  'Adja meg a c\u00edmadatokat \u00e9s bankadatokat',
  'Kattintson a "Ment\u00e9s" gombra',
  'Ezut\u00e1n minden \u00e1raj\u00e1nlat PDF-ben ezek az adatok jelennek meg',
]);

scenario('E) Webshop integr\u00e1ci\u00f3 API-n kereszt\u00fcl', [
  'Navig\u00e1ljon a "Be\u00e1ll\u00edt\u00e1sok" > "API kulcsok" f\u00fclre',
  'Hozzon l\u00e9tre egy \u00faj API kulcsot (pl. "Webshop")',
  'M\u00e1solja ki a kulcsot \u00e9s t\u00e1rolja biztons\u00e1gosan',
  'A webshop rendszer\u00e9ben \u00e1ll\u00edtsa be az API URL-t \u00e9s kulcsot',
  'A webshop most automatikusan k\u00fcldhet emaileket (rendel\u00e9s visszaigazol\u00e1s, sz\u00e1ll\u00edt\u00e1si \u00e9rtes\u00edt\u00e9s)',
  'Haszn\u00e1ljon sablonokat \u00e9s v\u00e1ltoz\u00f3kat a szem\u00e9lyre szabott emailekhez',
  'A k\u00fcld\u00f6tt levelek automatikusan megjelennek az Elk\u00fcld\u00f6tt f\u00fcl\u00f6n',
]);

scenario('F) Megl\u00e9v\u0151 \u00e1raj\u00e1nlat m\u00f3dos\u00edt\u00e1sa \u00e9s \u00fajrak\u00fcld\u00e9se', [
  'Navig\u00e1ljon az "\u00c1raj\u00e1nlatok" men\u00fcpontra',
  'Kattintson a m\u00f3dos\u00edtand\u00f3 \u00e1raj\u00e1nlatra',
  'M\u00f3dos\u00edtsa a t\u00e9teleket, \u00e1rakat vagy egy\u00e9b adatokat',
  'Mentse el a v\u00e1ltoztat\u00e1sokat',
  'T\u00f6ltse le az \u00faj PDF-et ellen\u0151rz\u00e9sre',
  'K\u00fcldje el \u00fajra emailben a vev\u0151nek',
]);

// ═══════════════════════════════════════════════════════════
// 10. GYIK
// ═══════════════════════════════════════════════════════════
newPage();
heading1('10. Gyakori k\u00e9rd\u00e9sek (GYIK)');

const faqs = [
  {
    q: 'Hogyan \u00e1ll\u00edthatom be a Gmail fi\u00f3komat?',
    a: 'A Gmail haszn\u00e1lat\u00e1hoz enged\u00e9lyezze a "Kev\u00e9sb\u00e9 biztons\u00e1gos alkalmaz\u00e1sok" opci\u00f3t, vagy hozzon l\u00e9tre egy alkalmaz\u00e1sjelsz\u00f3t a Google fi\u00f3kj\u00e1ban. SMTP: smtp.gmail.com:587, IMAP: imap.gmail.com:993.'
  },
  {
    q: 'Mi\u00e9rt nem l\u00e1tom a bej\u00f6v\u0151 leveleimet?',
    a: 'Kattintson a "Szinkroniz\u00e1l\u00e1s" gombra a Bej\u00f6v\u0151 f\u00fcl\u00f6n. Ellen\u0151rizze az IMAP be\u00e1ll\u00edt\u00e1sokat a Be\u00e1ll\u00edt\u00e1sok > Konfigur\u00e1ci\u00f3 f\u00fcl\u00f6n.'
  },
  {
    q: 'Hogyan t\u00f6lthet\u0151 fel a c\u00e9g log\u00f3ja?',
    a: 'Be\u00e1ll\u00edt\u00e1sok > M\u00e1rka f\u00fcl > Log\u00f3 felt\u00f6lt\u00e9se. T\u00e1mogatott form\u00e1tumok: PNG, JPG, SVG, WebP, GIF.'
  },
  {
    q: 'H\u00e1ny csatolm\u00e1nyt k\u00fcldhetek egy emailben?',
    a: 'Maximum 5 csatolm\u00e1ny k\u00fcldhet\u0151 egyetlen emailben.'
  },
  {
    q: 'Milyen p\u00e9nznemeket t\u00e1mogat az \u00e1raj\u00e1nlat?',
    a: 'Jelenleg HUF (magyar forint) \u00e9s EUR (eur\u00f3) t\u00e1mogatott.'
  },
  {
    q: 'Hogyan haszn\u00e1lhatom az API-t a webshopomban?',
    a: 'Hozzon l\u00e9tre egy API kulcsot a Be\u00e1ll\u00edt\u00e1sokban, majd haszn\u00e1lja a REST API v\u00e9gpontokat. R\u00e9szletes p\u00e9ld\u00e1k tal\u00e1lhat\u00f3k a Be\u00e1ll\u00edt\u00e1sok > API Dokument\u00e1ci\u00f3 f\u00fcl\u00f6n (Laravel, Node.js, Python p\u00e9ld\u00e1kkal).'
  },
  {
    q: 'Biztons\u00e1gos-e a rendszer?',
    a: 'Igen. JWT alap\u00fa hiteles\u00edt\u00e9st haszn\u00e1l, a jelszavak maszkolva jelennek meg, az API kulcsok k\u00fcl\u00f6n kezelhet\u0151k \u00e9s letilthat\u00f3k.'
  },
  {
    q: 'T\u00f6r\u00f6lhetem-e egy kapcsolat \u00f6sszes adat\u00e1t?',
    a: 'Igen. A kapcsolat t\u00f6rl\u00e9sekor az \u00f6sszes hozz\u00e1 tartoz\u00f3 email napl\u00f3 \u00e9s csatolm\u00e1ny is t\u00f6rl\u0151dik.'
  },
  {
    q: 'Hogyan \u00e1ll\u00edthatom be az \u00c1FA kulcsot?',
    a: 'Az \u00e1raj\u00e1nlat szerkeszt\u0151ben a "Be\u00e1ll\u00edt\u00e1sok" r\u00e9szben m\u00f3dos\u00edthat\u00f3 az \u00c1FA kulcs. Alapb\u00f3l 27%.'
  },
  {
    q: 'Lehet-e t\u00f6bb felhaszn\u00e1l\u00f3ja a rendszernek?',
    a: 'Jelenleg a rendszer egyetlen adminisztr\u00e1tor fi\u00f3kot t\u00e1mogat, amelyet a k\u00f6rnyezeti v\u00e1ltoz\u00f3kban kell be\u00e1ll\u00edtani.'
  },
];

faqs.forEach(faq => {
  if (doc.y > 680) newPage();
  doc.font('B').fontSize(10).fillColor(dark).text('K: ' + faq.q, M, doc.y, { width: W });
  doc.moveDown(0.2);
  doc.font('R').fontSize(10).fillColor(gray).text('V: ' + faq.a, M + 15, doc.y, { width: W - 15, lineGap: 2 });
  doc.moveDown(0.6);
});

// ═══════════════════════════════════════════════════════════
// FOOTER on all pages
// ═══════════════════════════════════════════════════════════
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  const footerY = doc.page.height - 40;
  doc.font('R').fontSize(7).fillColor('#aaa');
  doc.text(`Intimix Mailer Dokumentacio  |  ${i + 1} / ${range.count}`, M, footerY, { width: W, align: 'center', lineBreak: false });
}

doc.end();
console.log(`PDF dokumentacio generalva: ${outputPath}`);
