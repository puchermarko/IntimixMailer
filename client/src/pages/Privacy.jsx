import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Database, Eye, UserCheck, Clock, Mail } from 'lucide-react'
import { useUI } from '../App'

export default function Privacy() {
  const navigate = useNavigate()
  const { uiMode } = useUI()
  const isModern = uiMode === 'modern'

  return (
    <div className={`min-h-screen ${isModern ? 'bg-[#0f1115]' : 'bg-[#1a1d23]'} text-[#e0e2e7]`}>
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b border-white/5 ${isModern ? 'bg-[#0f1115]/80 backdrop-blur-xl' : 'glass'}`}>
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

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20 fade-in">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Adatvédelmi Tájékoztató</h1>
        <p className="text-gray-500 text-sm mb-10">Utolsó frissítés: 2026. február 15.</p>

        <div className="space-y-8">
          {/* Bevezetés */}
          <section className={isModern ? 'modern-card p-6 sm:p-8' : 'glass rounded-2xl p-6 sm:p-8'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                <Shield className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">1. Bevezetés</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A TM Infotech Kft. (székhely: 9325 Sopronnémeti, Hunyadi utca 3/a; a továbbiakban: „Adatkezelő") a Pultify szolgáltatás üzemeltetőjeként elkötelezett a felhasználók személyes adatainak védelme iránt.</p>
              <p>Jelen Adatvédelmi Tájékoztató az Európai Parlament és a Tanács (EU) 2016/679 számú általános adatvédelmi rendelete (GDPR), valamint az információs önrendelkezési jogról és az információszabadságról szóló 2011. évi CXII. törvény (Infotv.) alapján készült.</p>
            </div>
          </section>

          {/* Adatkezelő */}
          <section className={isModern ? 'modern-card p-6 sm:p-8' : 'glass rounded-2xl p-6 sm:p-8'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                <UserCheck className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">2. Az Adatkezelő adatai</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-2">
              <p><strong className="text-gray-300">Cégnév:</strong> TM Infotech Kft.</p>
              <p><strong className="text-gray-300">Székhely:</strong> 9325 Sopronnémeti, Hunyadi utca 3/a</p>
              <p><strong className="text-gray-300">Cégjegyzékszám:</strong> 08-09-034842</p>
              <p><strong className="text-gray-300">Adószám:</strong> 32053461-2-08</p>
              <p><strong className="text-gray-300">Email:</strong> <a href="mailto:info@tm-it.hu" className="text-[#2EC4BE] hover:text-white transition-colors">info@tm-it.hu</a></p>
              <p><strong className="text-gray-300">Telefon:</strong> +36 30 442 9707</p>
            </div>
          </section>

          {/* Kezelt adatok */}
          <section className={isModern ? 'modern-card p-6 sm:p-8' : 'glass rounded-2xl p-6 sm:p-8'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                <Database className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">3. Kezelt személyes adatok köre</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A Pultify szolgáltatás használata során az alábbi személyes adatokat kezeljük:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li><strong className="text-gray-300">Regisztrációs adatok:</strong> név, email cím, jelszó (titkosítva)</li>
                <li><strong className="text-gray-300">Cégadatok:</strong> cégnév, adószám, cím, telefonszám, bankszámla adatok (felhasználó által megadott)</li>
                <li><strong className="text-gray-300">Email beállítások:</strong> SMTP/IMAP szerver adatok, email cím, jelszó (titkosítva)</li>
                <li><strong className="text-gray-300">Levelezési adatok:</strong> elküldött és fogadott emailek tartalma, csatolmányok</li>
                <li><strong className="text-gray-300">Kapcsolattartói adatok:</strong> a felhasználó által felvitt ügyfelek/partnerek adatai</li>
                <li><strong className="text-gray-300">Technikai adatok:</strong> IP cím, böngésző típusa, bejelentkezési időpontok</li>
              </ul>
            </div>
          </section>

          {/* Adatkezelés célja */}
          <section className={isModern ? 'modern-card p-6 sm:p-8' : 'glass rounded-2xl p-6 sm:p-8'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                <Eye className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">4. Az adatkezelés célja és jogalapja</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>Az adatkezelés célja a Pultify szolgáltatás nyújtása, amely magában foglalja:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Felhasználói fiók létrehozása és kezelése</li>
                <li>Email küldés és fogadás biztosítása</li>
                <li>Kapcsolatkezelés (CRM) funkció működtetése</li>
                <li>Árajánlatok készítése és kezelése</li>
                <li>Számlázási és előfizetési folyamatok kezelése</li>
              </ul>
              <p className="mt-3"><strong className="text-gray-300">Jogalap:</strong> A felhasználó hozzájárulása (GDPR 6. cikk (1) bekezdés a) pont), valamint a szerződés teljesítése (GDPR 6. cikk (1) bekezdés b) pont).</p>
            </div>
          </section>

          {/* Adatmegőrzés */}
          <section className={isModern ? 'modern-card p-6 sm:p-8' : 'glass rounded-2xl p-6 sm:p-8'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                <Clock className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">5. Adatmegőrzés időtartama</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A személyes adatokat a felhasználói fiók fennállásáig, illetve a fiók törlésétől számított 30 napig őrizzük meg. A törlés után az adatok véglegesen eltávolításra kerülnek rendszereinkből.</p>
              <p>A számlázási adatokat a hatályos jogszabályok szerint 8 évig megőrizzük.</p>
            </div>
          </section>

          {/* Adatbiztonság */}
          <section className={isModern ? 'modern-card p-6 sm:p-8' : 'glass rounded-2xl p-6 sm:p-8'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                <Shield className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">6. Adatbiztonság</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>Az Adatkezelő megfelelő technikai és szervezési intézkedéseket alkalmaz a személyes adatok védelme érdekében:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Titkosított adatátvitel (HTTPS/TLS)</li>
                <li>Jelszavak hash-elése (bcrypt)</li>
                <li>JWT alapú hitelesítés</li>
                <li>Felhasználónkénti elkülönített adattárolás</li>
                <li>Rendszeres biztonsági mentések</li>
              </ul>
            </div>
          </section>

          {/* Jogok */}
          <section className={isModern ? 'modern-card p-6 sm:p-8' : 'glass rounded-2xl p-6 sm:p-8'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                <UserCheck className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">7. Az érintett jogai</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>A GDPR alapján Ön az alábbi jogokkal rendelkezik:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li><strong className="text-gray-300">Hozzáférés joga:</strong> tájékoztatást kérhet a kezelt adatairól</li>
                <li><strong className="text-gray-300">Helyesbítés joga:</strong> kérheti adatai módosítását</li>
                <li><strong className="text-gray-300">Törlés joga:</strong> kérheti adatai törlését</li>
                <li><strong className="text-gray-300">Adathordozhatóság joga:</strong> kérheti adatai géppel olvasható formátumban történő kiadását</li>
                <li><strong className="text-gray-300">Tiltakozás joga:</strong> tiltakozhat az adatkezelés ellen</li>
              </ul>
              <p className="mt-3">Jogai gyakorlásához kérjük, lépjen kapcsolatba velünk az <a href="mailto:info@tm-it.hu" className="text-[#2EC4BE] hover:text-white transition-colors">info@tm-it.hu</a> email címen.</p>
            </div>
          </section>

          {/* Jogorvoslat */}
          <section className={isModern ? 'modern-card p-6 sm:p-8' : 'glass rounded-2xl p-6 sm:p-8'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                <Mail className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">8. Jogorvoslat</h2>
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-3">
              <p>Amennyiben úgy érzi, hogy személyes adatainak kezelése sérti a jogszabályi előírásokat, panasszal fordulhat a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH):</p>
              <div className={`rounded-xl p-4 mt-2 ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                <p className="text-gray-300 font-medium text-sm">Nemzeti Adatvédelmi és Információszabadság Hatóság</p>
                <p className="text-xs text-gray-500 mt-1">1055 Budapest, Falk Miksa utca 9-11.</p>
                <p className="text-xs text-gray-500">Telefon: +36 1 391 1400</p>
                <p className="text-xs text-gray-500">Email: ugyfelszolgalat@naih.hu</p>
                <p className="text-xs text-gray-500">Web: <a href="https://naih.hu" target="_blank" rel="noopener noreferrer" className="text-[#2EC4BE] hover:text-white transition-colors">https://naih.hu</a></p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
