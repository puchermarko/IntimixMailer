import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Shield, CreditCard, AlertTriangle, Scale, Mail } from 'lucide-react'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#1a1d23] text-[#e0e2e7]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Vissza
            </button>
            <img src="/pultify-logo.png" alt="Pultify" className="h-7 object-contain" />
            <div className="w-16" />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Általános Szerződési Feltételek</h1>
        <p className="text-gray-500 text-sm mb-10">Utolsó frissítés: 2026. február 15.</p>

        <div className="space-y-8">
          {/* Szolgáltató */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">1. A Szolgáltató</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A Pultify szolgáltatás üzemeltetője a TM Infotech Kft. (székhely: 9325 Sopronnémeti, Hunyadi utca 3/a; cégjegyzékszám: 08-09-034842; adószám: 32053461-2-08; a továbbiakban: „Szolgáltató").</p>
              <p>Jelen Általános Szerződési Feltételek (a továbbiakban: „ÁSZF") a Pultify webalkalmazás (a továbbiakban: „Szolgáltatás") használatának feltételeit szabályozzák.</p>
            </div>
          </section>

          {/* Szolgáltatás leírása */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">2. A Szolgáltatás leírása</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A Pultify egy felhőalapú üzleti management platform, amely az alábbi funkciókat biztosítja:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Email küldés és fogadás (SMTP/IMAP integráció)</li>
                <li>Kapcsolatkezelés (CRM)</li>
                <li>Árajánlat készítés és PDF generálás</li>
                <li>Email sablonok kezelése</li>
                <li>Tömeges email küldés</li>
                <li>Céges márkaépítés (logó, cégadatok)</li>
              </ul>
            </div>
          </section>

          {/* Regisztráció */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">3. Regisztráció és fiókkezelés</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A Szolgáltatás használatához regisztráció szükséges. A regisztráció során a Felhasználó köteles valós adatokat megadni.</p>
              <p>A Felhasználó felelős a fiókjához tartozó bejelentkezési adatok bizalmas kezeléséért. A fiókkal végzett minden tevékenységért a Felhasználó felel.</p>
              <p>A Szolgáltató fenntartja a jogot, hogy a hamis adatokkal létrehozott fiókokat előzetes értesítés nélkül törölje.</p>
            </div>
          </section>

          {/* Próbaidőszak és előfizetés */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">4. Próbaidőszak és előfizetés</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p><strong className="text-gray-300">Próbaidőszak:</strong> Minden új felhasználó 30 napos ingyenes próbaidőszakot kap, amely a regisztráció pillanatában automatikusan aktiválódik. A próbaidőszak alatt a Szolgáltatás teljes funkciókészlete elérhető.</p>
              <p><strong className="text-gray-300">Előfizetés:</strong> A próbaidőszak lejártát követően a Szolgáltatás használatához aktív előfizetés szükséges. Az aktuális árak a Szolgáltatás weboldalán találhatók.</p>
              <p><strong className="text-gray-300">Lemondás:</strong> Az előfizetés bármikor lemondható. Lemondás esetén a Szolgáltatás az aktuális számlázási időszak végéig elérhető marad.</p>
            </div>
          </section>

          {/* Felhasználó kötelezettségei */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">5. A Felhasználó kötelezettségei</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A Felhasználó vállalja, hogy:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>A Szolgáltatást kizárólag jogszerű célokra használja</li>
                <li>Nem küld kéretlen kereskedelmi üzeneteket (spam)</li>
                <li>Betartja a hatályos adatvédelmi jogszabályokat saját ügyfelei adatainak kezelése során</li>
                <li>Nem próbálja meg a Szolgáltatás biztonsági rendszereit megkerülni</li>
                <li>Nem használja a Szolgáltatást jogellenes, csalárd vagy káros tevékenységre</li>
              </ul>
              <p className="mt-3">A fenti szabályok megsértése esetén a Szolgáltató jogosult a Felhasználó fiókját azonnali hatállyal felfüggeszteni vagy törölni.</p>
            </div>
          </section>

          {/* Felelősségkorlátozás */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">6. Felelősségkorlátozás</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A Szolgáltató mindent megtesz a Szolgáltatás folyamatos és hibamentes működése érdekében, azonban nem vállal felelősséget:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>A Szolgáltatás átmeneti elérhetetlenségéből eredő károkért</li>
                <li>A Felhasználó által megadott helytelen adatokból eredő problémákért</li>
                <li>Harmadik fél szolgáltatásainak (SMTP/IMAP szerverek) hibáiért</li>
                <li>A Felhasználó által küldött emailek tartalmáért</li>
                <li>Vis maior eseményekből eredő szolgáltatáskiesésért</li>
              </ul>
            </div>
          </section>

          {/* Szellemi tulajdon */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">7. Szellemi tulajdon</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A Pultify név, logó, design és a Szolgáltatás forráskódja a TM Infotech Kft. szellemi tulajdonát képezik. A Felhasználó a Szolgáltatás használatával nem szerez semmilyen szellemi tulajdonjogot.</p>
              <p>A Felhasználó által feltöltött tartalmak (logók, sablonok, dokumentumok) a Felhasználó tulajdonában maradnak.</p>
            </div>
          </section>

          {/* ÁSZF módosítása */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">8. Az ÁSZF módosítása</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A Szolgáltató fenntartja a jogot jelen ÁSZF módosítására. A módosításokról a Felhasználókat email útján vagy a Szolgáltatás felületén értesítjük. A módosított ÁSZF a közzététel napján lép hatályba.</p>
            </div>
          </section>

          {/* Irányadó jog */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">9. Irányadó jog és jogviták</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>Jelen ÁSZF-re a magyar jog az irányadó. A felek vitáikat elsősorban békés úton kísérlik meg rendezni. Ennek sikertelensége esetén a Győri Törvényszék kizárólagos illetékességét kötik ki.</p>
            </div>
          </section>

          {/* Kapcsolat */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">10. Kapcsolat</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>Az ÁSZF-fel kapcsolatos kérdéseit az alábbi elérhetőségeken teheti fel:</p>
              <div className="glass-light rounded-xl p-4 mt-2">
                <p className="text-gray-300 font-medium text-sm">TM Infotech Kft.</p>
                <p className="text-xs text-gray-500 mt-1">Email: <a href="mailto:info@tm-it.hu" className="text-[#2EC4BE] hover:text-white transition-colors">info@tm-it.hu</a></p>
                <p className="text-xs text-gray-500">Telefon: +36 30 442 9707</p>
                <p className="text-xs text-gray-500">Web: <a href="https://tm-it.hu" target="_blank" rel="noopener noreferrer" className="text-[#2EC4BE] hover:text-white transition-colors">https://tm-it.hu</a></p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
