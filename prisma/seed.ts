/**
 * Masar — demo data seed.
 * Deterministic (seeded RNG) so re-running produces the same dataset.
 * All money is Int centimes (1 DH = 100).
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const db = new PrismaClient();
const uid = () => crypto.randomUUID().replace(/-/g, "");

// ── deterministic RNG ─────────────────────────────────────────────
let s = 1337;
const rnd = () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
const ref = () => "MSR-" + Array.from({ length: 6 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[int(0, 30)]).join("");

// ── Morocco geography ─────────────────────────────────────────────
type CitySeed = { fr: string; ar: string; en: string; region: string; fee: number; eta: number; lat: number; lng: number; remote?: boolean };
const REGIONS: { code: string; fr: string; ar: string; en: string }[] = [
  { code: "TTA", fr: "Tanger-Tétouan-Al Hoceïma", ar: "طنجة - تطوان - الحسيمة", en: "Tanger-Tétouan-Al Hoceïma" },
  { code: "ORI", fr: "L'Oriental", ar: "الشرق", en: "Oriental" },
  { code: "FM", fr: "Fès-Meknès", ar: "فاس - مكناس", en: "Fès-Meknès" },
  { code: "RSK", fr: "Rabat-Salé-Kénitra", ar: "الرباط - سلا - القنيطرة", en: "Rabat-Salé-Kénitra" },
  { code: "BML", fr: "Béni Mellal-Khénifra", ar: "بني ملال - خنيفرة", en: "Béni Mellal-Khénifra" },
  { code: "CAS", fr: "Casablanca-Settat", ar: "الدار البيضاء - سطات", en: "Casablanca-Settat" },
  { code: "MRK", fr: "Marrakech-Safi", ar: "مراكش - آسفي", en: "Marrakech-Safi" },
  { code: "DRR", fr: "Drâa-Tafilalet", ar: "درعة - تافيلالت", en: "Drâa-Tafilalet" },
  { code: "SM", fr: "Souss-Massa", ar: "سوس - ماسة", en: "Souss-Massa" },
  { code: "GON", fr: "Guelmim-Oued Noun", ar: "كلميم - واد نون", en: "Guelmim-Oued Noun" },
  { code: "LSH", fr: "Laâyoune-Sakia El Hamra", ar: "العيون - الساقية الحمراء", en: "Laâyoune-Sakia El Hamra" },
  { code: "DOD", fr: "Dakhla-Oued Ed-Dahab", ar: "الداخلة - وادي الذهب", en: "Dakhla-Oued Ed-Dahab" },
];
const CITIES: CitySeed[] = [
  { fr: "Casablanca", ar: "الدار البيضاء", en: "Casablanca", region: "CAS", fee: 2500, eta: 26, lat: 33.5731, lng: -7.5898 },
  { fr: "Mohammedia", ar: "المحمدية", en: "Mohammedia", region: "CAS", fee: 2500, eta: 28, lat: 33.6866, lng: -7.383 },
  { fr: "Berrechid", ar: "برشيد", en: "Berrechid", region: "CAS", fee: 2800, eta: 30, lat: 33.2655, lng: -7.5826 },
  { fr: "Settat", ar: "سطات", en: "Settat", region: "CAS", fee: 3200, eta: 34, lat: 33.001, lng: -7.6166 },
  { fr: "El Jadida", ar: "الجديدة", en: "El Jadida", region: "CAS", fee: 3200, eta: 34, lat: 33.2316, lng: -8.5007 },
  { fr: "Rabat", ar: "الرباط", en: "Rabat", region: "RSK", fee: 3000, eta: 30, lat: 34.0209, lng: -6.8416 },
  { fr: "Salé", ar: "سلا", en: "Salé", region: "RSK", fee: 3000, eta: 30, lat: 34.0531, lng: -6.798 },
  { fr: "Témara", ar: "تمارة", en: "Témara", region: "RSK", fee: 3000, eta: 32, lat: 33.9287, lng: -6.9067 },
  { fr: "Kénitra", ar: "القنيطرة", en: "Kénitra", region: "RSK", fee: 3200, eta: 34, lat: 34.261, lng: -6.5802 },
  { fr: "Marrakech", ar: "مراكش", en: "Marrakech", region: "MRK", fee: 3200, eta: 34, lat: 31.6295, lng: -7.9811 },
  { fr: "Safi", ar: "آسفي", en: "Safi", region: "MRK", fee: 3500, eta: 40, lat: 32.2994, lng: -9.2372 },
  { fr: "Essaouira", ar: "الصويرة", en: "Essaouira", region: "MRK", fee: 4000, eta: 48, lat: 31.5085, lng: -9.7595 },
  { fr: "Fès", ar: "فاس", en: "Fès", region: "FM", fee: 3200, eta: 36, lat: 34.0181, lng: -5.0078 },
  { fr: "Meknès", ar: "مكناس", en: "Meknès", region: "FM", fee: 3200, eta: 36, lat: 33.8935, lng: -5.5473 },
  { fr: "Taza", ar: "تازة", en: "Taza", region: "FM", fee: 3800, eta: 44, lat: 34.21, lng: -4.0088 },
  { fr: "Tanger", ar: "طنجة", en: "Tangier", region: "TTA", fee: 3200, eta: 36, lat: 35.7595, lng: -5.834 },
  { fr: "Tétouan", ar: "تطوان", en: "Tetouan", region: "TTA", fee: 3500, eta: 40, lat: 35.5785, lng: -5.3684 },
  { fr: "Larache", ar: "العرائش", en: "Larache", region: "TTA", fee: 3600, eta: 42, lat: 35.1932, lng: -6.1557 },
  { fr: "Al Hoceïma", ar: "الحسيمة", en: "Al Hoceima", region: "TTA", fee: 4200, eta: 56, lat: 35.2517, lng: -3.9372, remote: true },
  { fr: "Agadir", ar: "أكادير", en: "Agadir", region: "SM", fee: 3500, eta: 40, lat: 30.4278, lng: -9.5981 },
  { fr: "Inezgane", ar: "إنزكان", en: "Inezgane", region: "SM", fee: 3500, eta: 40, lat: 30.3486, lng: -9.5422 },
  { fr: "Taroudant", ar: "تارودانت", en: "Taroudant", region: "SM", fee: 3800, eta: 48, lat: 30.4703, lng: -8.8762 },
  { fr: "Tiznit", ar: "تزنيت", en: "Tiznit", region: "SM", fee: 4200, eta: 56, lat: 29.6974, lng: -9.7316, remote: true },
  { fr: "Oujda", ar: "وجدة", en: "Oujda", region: "ORI", fee: 4000, eta: 48, lat: 34.6814, lng: -1.9086 },
  { fr: "Nador", ar: "الناظور", en: "Nador", region: "ORI", fee: 4200, eta: 52, lat: 35.1681, lng: -2.9287 },
  { fr: "Béni Mellal", ar: "بني ملال", en: "Beni Mellal", region: "BML", fee: 3600, eta: 42, lat: 32.3373, lng: -6.3498 },
  { fr: "Khénifra", ar: "خنيفرة", en: "Khenifra", region: "BML", fee: 3800, eta: 46, lat: 32.9389, lng: -5.0568 },
  { fr: "Errachidia", ar: "الرشيدية", en: "Errachidia", region: "DRR", fee: 4500, eta: 72, lat: 31.9314, lng: -4.4244, remote: true },
  { fr: "Ouarzazate", ar: "ورزازات", en: "Ouarzazate", region: "DRR", fee: 4500, eta: 72, lat: 30.9335, lng: -6.937, remote: true },
  { fr: "Guelmim", ar: "كلميم", en: "Guelmim", region: "GON", fee: 5500, eta: 84, lat: 28.987, lng: -10.0574, remote: true },
  { fr: "Laâyoune", ar: "العيون", en: "Laâyoune", region: "LSH", fee: 7000, eta: 96, lat: 27.1253, lng: -13.1625, remote: true },
  { fr: "Dakhla", ar: "الداخلة", en: "Dakhla", region: "DOD", fee: 8500, eta: 120, lat: 23.6848, lng: -15.958, remote: true },
];

// ── people ────────────────────────────────────────────────────────
const FIRST = ["Youssef", "Mehdi", "Hamza", "Omar", "Anas", "Yassine", "Ilyas", "Zakaria", "Bilal", "Reda", "Ayoub", "Otmane", "Soufiane", "Achraf", "Walid", "Hicham", "Nabil", "Karim", "Rachid", "Mourad"];
const FIRST_F = ["Fatima Zahra", "Aya", "Salma", "Khadija", "Imane", "Meryem", "Sara", "Rania", "Nadia", "Loubna", "Hajar", "Asmae", "Ghita", "Sofia", "Wiam", "Douae", "Hind", "Chaimae", "Ilham", "Zineb"];
const LAST = ["El Amrani", "Bennani", "Alaoui", "Idrissi", "El Fassi", "Bouhaddou", "Tazi", "Chraibi", "Berrada", "Squalli", "El Mansouri", "Lahlou", "Bennis", "Cherkaoui", "Naciri", "Benjelloun", "Haddadi", "Fassi Fihri", "Ouazzani", "Lamrani", "Ait Taleb", "Ouhaddou", "Amzil", "Boukhris", "Zeroual", "Sabri", "Kadiri", "Belkadi", "Sbai", "El Ghazi"];
const fullName = () => (chance(0.45) ? pick(FIRST_F) : pick(FIRST)) + " " + pick(LAST);
const phone = () => "+2126" + String(int(10000000, 99999999));
const phoneB = () => "+2127" + String(int(10000000, 99999999));
const streets = ["Rue", "Avenue", "Boulevard"];
const quarters: Record<string, string[]> = {
  Casablanca: ["Maârif", "Anfa", "Gauthier", "Bourgogne", "Sidi Belyout", "Oulfa", "Hay Hassani", "Ain Diab", "Derb Ghallef", "Riviera"],
  Rabat: ["Agdal", "Hassan", "Hay Riad", "Souissi", "Yacoub El Mansour"],
  Salé: ["Tabriquet", "Hay Salam", "Bettana"],
  Marrakech: ["Guéliz", "Hivernage", "Médina", "Targa", "Massira"],
  Fès: ["Ville Nouvelle", "Atlas", "Narjiss", "Saiss"],
  Tanger: ["Malabata", "Iberia", "Branes", "Val Fleuri"],
  Agadir: ["Talborjt", "Founty", "Hay Mohammadi", "Dakhla"],
};
const randomAddress = (city: string) =>
  `${pick(streets)} ${pick(["Mohammed V", "Hassan II", "Al Qods", "Al Massira", "Zerktouni", "Al Andalous", "Mohammed Diouri", "Ibn Sina", "Oued Ziz", "Falls"])}, ${pick(quarters[city] ?? ["Centre", "Hay Salam", "Nahda"])}, ${city}`;

// ── catalogs ──────────────────────────────────────────────────────
const MERCHANTS = [
  { name: "Zellige Store", slug: "zellige-store", email: "merchant@masar.ma", owner: "Nadia Benjelloun", city: "Casablanca", color: "#2F45E0", plan: "growth", cats: ["Décoration", "Artisanat", "Maison"], products: [["Carrelage zellige bleu Majorelle (10 pcs)", "Décoration", 48000, 142], ["Lampe en laiton ciselée", "Maison", 65000, 38], ["Plateau cuivre gravé", "Artisanat", 39000, 54], ["Tajine céramique Tagine & Co", "Maison", 22000, 87], ["Miroir zellige octogonal", "Décoration", 85000, 21], ["Poignée de porte artisanale", "Maison", 12000, 160], ["Boîte à épices 3 étages", "Maison", 18000, 73]] },
  { name: "Atlas Cosmetics", slug: "atlas-cosmetics", email: "contact@atlascosmetics.ma", owner: "Meryem Cherkaoui", city: "Marrakech", color: "#0E7A5F", plan: "growth", cats: ["Cosmétiques", "Soin"], products: [["Huile d'argan bio 100ml", "Cosmétiques", 12000, 240], ["Ghassoul parfumé rose", "Soin", 6500, 180], ["Savon noir beldi eucalyptus", "Soin", 5500, 210], ["Coffret rituel hammam complet", "Cosmétiques", 35000, 65], ["Crème jour figue de barbarie", "Cosmétiques", 28000, 92], ["Brume capillaire néroli", "Cosmétiques", 15000, 118]] },
  { name: "Medina Threads", slug: "medina-threads", email: "salam@medinathreads.ma", owner: "Hamza Alaoui", city: "Fès", color: "#8A4B08", plan: "starter", cats: ["Mode", "Accessoires"], products: [["Djellaba homme lin naturel", "Mode", 62000, 45], ["Babouches cuir Fassi", "Mode", 18000, 130], ["Ceinture cuir tressée", "Accessoires", 14000, 88], ["Caftan brodé main", "Mode", 155000, 18], ["Sac bandoulière tissé", "Accessoires", 24000, 67], ["Écharpe laine Chefchaouen", "Mode", 9500, 145]] },
  { name: "Sahara Tech", slug: "sahara-tech", email: "hello@saharatech.ma", owner: "Omar El Fassi", city: "Agadir", color: "#0F4C81", plan: "scale", cats: ["Électronique", "Accessoires"], products: [["Écouteurs TWS Pro", "Électronique", 42000, 210], ["Chargeur GaN 65W", "Électronique", 26000, 165], ["Powerbank 20000mAh", "Électronique", 31000, 140], ["Support voiture magnétique", "Accessoires", 8500, 300], ["Souris ergonomique sans fil", "Électronique", 19000, 98], ["Clé USB-C 256Go", "Électronique", 22000, 176]] },
  { name: "Riad Home Déco", slug: "riad-home", email: "bzef@riadhome.ma", owner: "Salma Idrissi", city: "Rabat", color: "#7A1F2B", plan: "growth", cats: ["Maison", "Décoration"], products: [["Coussin sabra brodé", "Maison", 13000, 190], ["Tapis Beni Ouarain 150×250", "Décoration", 280000, 12], ["Lanterne marocaine or", "Décoration", 17000, 96], ["Set 6 verres thé peints", "Maison", 14000, 154], ["Brûleur céramique + encens", "Maison", 8000, 205]] },
  { name: "Chaouen Wear", slug: "chaouen-wear", email: "team@chaouenwear.ma", owner: "Yassine Bennis", city: "Tanger", color: "#1D5F8A", plan: "starter", cats: ["Mode"], products: [["T-shirt bleu Chefchaouen", "Mode", 9900, 260], ["Hoodie Atlas Edition", "Mode", 24000, 120], ["Casquette brodée", "Mode", 6500, 240], ["Sweat zippé unisexe", "Mode", 27000, 85]] },
];

const COURIERS = [
  { name: "Youssef El Amrani", email: "courier@masar.ma", city: "Casablanca", vehicle: "MOTORCYCLE", code: "MSR-C001" },
  { name: "Rachid Ouhaddou", email: "courier2@masar.ma", city: "Casablanca", vehicle: "MOTORCYCLE", code: "MSR-C002" },
  { name: "Hicham Ait Taleb", email: "courier3@masar.ma", city: "Marrakech", vehicle: "MOTORCYCLE", code: "MSR-C003" },
  { name: "Mohamed Amzil", email: "courier4@masar.ma", city: "Rabat", vehicle: "CAR", code: "MSR-C004" },
  { name: "Anouar Boukhris", email: "courier5@masar.ma", city: "Fès", vehicle: "MOTORCYCLE", code: "MSR-C005" },
  { name: "Abdelilah Zeroual", email: "courier6@masar.ma", city: "Tanger", vehicle: "MOTORCYCLE", code: "MSR-C006" },
  { name: "Said Bennis", email: "courier7@masar.ma", city: "Agadir", vehicle: "VAN", code: "MSR-C007" },
  { name: "Jamal Sabri", email: "courier8@masar.ma", city: "Meknès", vehicle: "MOTORCYCLE", code: "MSR-C008" },
  { name: "Tarik Kadiri", email: "courier9@masar.ma", city: "Salé", vehicle: "MOTORCYCLE", code: "MSR-C009" },
  { name: "Mounir Belkadi", email: "courier10@masar.ma", city: "Casablanca", vehicle: "VAN", code: "MSR-C010" },
];

const FAIL_REASONS = [
  { code: "NO_ANSWER", fr: "Client injoignable", ar: "الزبون غير متاح", en: "Customer unreachable" },
  { code: "WRONG_ADDRESS", fr: "Adresse incorrecte", ar: "عنوان خاطئ", en: "Wrong address" },
  { code: "POSTPONED", fr: "Reporté par le client", ar: "الزبون أجّل التوصيل", en: "Customer postponed" },
  { code: "REFUSED", fr: "Colis refusé", ar: "الزبون رفض الاستلام", en: "Parcel refused" },
  { code: "OUT_OF_ZONE", fr: "Hors zone de livraison", ar: "خارج نطاق التوصيل", en: "Out of delivery zone" },
  { code: "UNREACHABLE", fr: "Téléphone éteint", ar: "الهاتف مغلق", en: "Phone switched off" },
];
const RETURN_REASONS = ["Colis refusé après 3 tentatives", "Adresse introuvable", "Client injoignable après 3 tentatives", "Produit non conforme à la commande", "Annulé par le client"];

const DAY = 86400000;
const now = new Date();
const daysAgo = (d: number, hourJitter = true) => new Date(now.getTime() - d * DAY - (hourJitter ? int(0, 10) * 3600000 : 0));

async function main() {
  console.log("Seeding Masar…");
  await db.$transaction([
    db.webhookDelivery.deleteMany(), db.webhook.deleteMany(), db.apiKey.deleteMany(), db.integration.deleteMany(),
    db.auditLog.deleteMany(), db.notification.deleteMany(), db.setting.deleteMany(),
    db.settlement.deleteMany(), db.codTransaction.deleteMany(), db.payment.deleteMany(),
    db.return.deleteMany(), db.deliveryAttempt.deleteMany(), db.delivery.deleteMany(),
    db.orderEvent.deleteMany(), db.orderItem.deleteMany(), db.order.deleteMany(),
    db.address.deleteMany(), db.product.deleteMany(), db.customer.deleteMany(),
    db.zone.deleteMany(), db.city.deleteMany(), db.region.deleteMany(),
    db.merchantStaff.deleteMany(), db.courier.deleteMany(), db.merchant.deleteMany(), db.user.deleteMany(),
  ]);

  // geography
  const regionRows = REGIONS.map((r) => ({ id: uid(), code: r.code, nameFr: r.fr, nameAr: r.ar, nameEn: r.en }));
  const cityRows = CITIES.map((c) => ({ id: uid(), nameFr: c.fr, nameAr: c.ar, nameEn: c.en, regionId: regionRows.find((r) => r.code === c.region)!.id, isRemote: !!c.remote, lat: c.lat, lng: c.lng }));
  const zoneRows = cityRows.flatMap((c) => {
    const cs = CITIES.find((x) => x.fr === c.nameFr)!;
    const zones = [{ name: `${c.nameFr} — Centre`, delta: 0 }, ...(cs.fr === "Casablanca" ? [{ name: "Grand Casablanca — Périphérie", delta: 300 }] : [])];
    return zones.map((z) => ({
      id: uid(), name: z.name, cityId: c.id,
      deliveryFee: cs.fee + z.delta,
      returnFee: Math.max(1500, Math.round(((cs.fee + z.delta) * 0.6) / 100) * 100),
      etaHours: cs.eta + z.delta / 100,
      weightSurcharge: 500, codFeePct: 0, isActive: true,
    }));
  });

  // users / merchants / couriers
  const pwHash = bcrypt.hashSync("Demo1234!", 10);
  const adminId = uid();
  const userRows = [{ id: adminId, email: "admin@masar.ma", passwordHash: pwHash, name: "Karim El Idrissi", role: "ADMIN", phone: "+212661223344", locale: "fr", isActive: true }];
  const merchantRows: any[] = [], staffRows: any[] = [];
  for (const m of MERCHANTS) {
    const mid = uid(), mu = uid();
    userRows.push({ id: mu, email: m.email, passwordHash: pwHash, name: m.owner, role: "MERCHANT", phone: phone(), locale: "fr", isActive: true });
    merchantRows.push({ id: mid, name: m.name, slug: m.slug, legalName: `${m.name} SARL`, email: m.email, phone: phone(), city: m.city, address: randomAddress(m.city), brandColor: m.color, status: m.slug === "tafilalet-dates" ? "SUSPENDED" : m.slug === "souk-digital" ? "PENDING" : "ACTIVE", plan: m.plan, settlementCycle: chance(0.5) ? "WEEKLY" : chance(0.5) ? "BIWEEKLY" : "MONTHLY", walletBalance: 0, createdAt: daysAgo(int(120, 400)) });
    staffRows.push({ id: uid(), userId: mu, merchantId: mid, staffRole: "OWNER" });
    if (chance(0.5)) {
      const su = uid();
      userRows.push({ id: su, email: `staff@${m.slug}.ma`, passwordHash: pwHash, name: pick(FIRST) + " " + pick(LAST), role: "MERCHANT_STAFF", phone: phone(), locale: "ar", isActive: true });
      staffRows.push({ id: uid(), userId: su, merchantId: mid, staffRole: "OPERATOR" });
    }
  }
  // two extra demo merchants (suspended / pending)
  for (const m of [{ name: "Tafilalet Dates", slug: "tafilalet-dates", email: "contact@tafilalet.ma", owner: "Hassan Oubella", city: "Errachidia", color: "#5B3A1E", plan: "starter" }, { name: "Souk Digital", slug: "souk-digital", email: "team@soukdigital.ma", owner: "Imane Chraibi", city: "Casablanca", color: "#444", plan: "growth" }]) {
    const mid = uid(), mu = uid();
    userRows.push({ id: mu, email: m.email, passwordHash: pwHash, name: m.owner, role: "MERCHANT", phone: phone(), locale: "fr", isActive: true });
    merchantRows.push({ id: mid, name: m.name, slug: m.slug, legalName: `${m.name} SARL AU`, email: m.email, phone: phone(), city: m.city, address: randomAddress(m.city), brandColor: m.color, status: m.slug === "tafilalet-dates" ? "SUSPENDED" : "PENDING", plan: m.plan, settlementCycle: "WEEKLY", walletBalance: 0, createdAt: daysAgo(int(60, 200)) });
    staffRows.push({ id: uid(), userId: mu, merchantId: mid, staffRole: "OWNER" });
  }
  const courierRows: any[] = [];
  for (const c of COURIERS) {
    const cu = uid();
    userRows.push({ id: cu, email: c.email, passwordHash: pwHash, name: c.name, role: "COURIER", phone: phone(), locale: "fr", isActive: true });
    courierRows.push({ id: uid(), userId: cu, employeeCode: c.code, vehicle: c.vehicle, homeCity: c.city, zones: JSON.stringify([c.city]), status: chance(0.9) ? "ACTIVE" : "INACTIVE", rating: Math.round((4.2 + rnd() * 0.75) * 10) / 10, feePerDelivery: 1400, createdAt: daysAgo(int(90, 500)) });
  }

  // customers & products per merchant
  const customerRows: any[] = [], productRows: any[] = [], addressRows: any[] = [];
  const cityNames = CITIES.map((c) => c.fr);
  for (const m of merchantRows) {
    const mc = MERCHANTS.find((x) => x.name === m.name);
    const n = m.status === "ACTIVE" ? int(18, 26) : 4;
    const used = new Set<string>();
    for (let i = 0; i < n; i++) {
      const cid = uid();
      let ph = phone();
      while (used.has(ph)) ph = phone();
      used.add(ph);
      const city = chance(0.55) ? m.city : pick(cityNames);
      customerRows.push({ id: cid, merchantId: m.id, fullName: fullName(), phone: ph, secondaryPhone: chance(0.2) ? phoneB() : null, city, address: randomAddress(city), notes: chance(0.15) ? pick(["Livrer après 18h", "Appeler avant d'arriver", "Sonner 2 fois", "Garder au gardiennage"]) : null, totalOrders: 0, totalSpent: 0, failedCount: 0, returnedCount: 0, createdAt: daysAgo(int(5, 120)) });
      if (chance(0.35)) addressRows.push({ id: uid(), customerId: cid, label: pick(["Domicile", "Bureau", "Parents"]), line: randomAddress(city), city, isDefault: true });
    }
    for (const [name, category, price, stock] of (mc?.products ?? [[`${m.name} article ${1}`, "Général", 15000, 50]])) {
      productRows.push({ id: uid(), merchantId: m.id, name, sku: `${m.slug.slice(0, 3).toUpperCase()}-${int(1000, 9999)}`, category, price, stock, variants: null, isActive: true, createdAt: daysAgo(int(10, 150)) });
    }
  }

  // ── orders ────────────────────────────────────────────────────────
  const orderRows: any[] = [], itemRows: any[] = [], eventRows: any[] = [], deliveryRows: any[] = [], attemptRows: any[] = [], paymentRows: any[] = [], returnRows: any[] = [], codRows: any[] = [];
  const activeMerchants = merchantRows.filter((m) => m.status === "ACTIVE");
  const citiesByFee = new Map(cityRows.map((c) => [c.nameFr, c]));
  const zoneByCity = new Map<string, any>();
  for (const z of zoneRows) if (!zoneByCity.has(cityRows.find((c) => c.id === z.cityId)!.nameFr)) zoneByCity.set(cityRows.find((c) => c.id === z.cityId)!.nameFr, z);
  const couriersByCity = new Map<string, any[]>();
  for (const c of courierRows.filter((c) => c.status === "ACTIVE")) {
    const arr = couriersByCity.get(c.homeCity) ?? [];
    arr.push(c); couriersByCity.set(c.homeCity, arr);
  }
  let stlCounter = 1;

  for (const m of activeMerchants) {
    const mCustomers = customerRows.filter((c) => c.merchantId === m.id);
    const mProducts = productRows.filter((p) => p.merchantId === m.id);
    for (let d = 89; d >= 0; d--) {
      const isDemoMerchant = m.slug === "zellige-store";
      const count = isDemoMerchant ? int(2, 6) : chance(0.75) ? int(1, 4) : 0;
      for (let k = 0; k < count; k++) {
        const createdAt = daysAgo(d);
        createdAt.setHours(int(9, 20), int(0, 59), 0, 0);
        if (createdAt > now) continue;
        const cust = pick(mCustomers);
        const city = cust.city;
        const zone = zoneByCity.get(city) ?? zoneByCity.get("Casablanca")!;
        const nItems = chance(0.65) ? 1 : chance(0.8) ? 2 : 3;
        const chosen = Array.from({ length: nItems }, () => pick(mProducts));
        let itemsTotal = 0;
        const oId = uid(), oRef = ref();
        const items = chosen.map((p) => {
          const q = chance(0.85) ? 1 : int(2, 3);
          const it = { id: uid(), orderId: oId, productId: p.id, name: p.name, sku: p.sku, quantity: q, unitPrice: p.price, total: p.price * q };
          itemsTotal += it.total;
          return it;
        });
        const shippingFee = zone.deliveryFee;
        const discount = chance(0.12) ? Math.round((itemsTotal * (chance(0.5) ? 0.05 : 0.1)) / 100) * 100 : 0;
        const total = itemsTotal + shippingFee - discount;
        const prepaid = chance(0.08);
        const codAmount = prepaid ? 0 : total;
        const source = m.slug === "zellige-store" && chance(0.3) ? pick(["SHOPIFY", "API", "WOOCOMMERCE"]) : "DASHBOARD";

        // status by age
        let status: string;
        const r = rnd();
        if (d <= 1) status = r < 0.34 ? "NEW" : r < 0.62 ? "CONFIRMED" : r < 0.8 ? "READY_FOR_PICKUP" : r < 0.9 ? "PICKED_UP" : r < 0.96 ? "IN_TRANSIT" : "OUT_FOR_DELIVERY";
        else if (d <= 3) status = r < 0.08 ? "NEW" : r < 0.2 ? "CONFIRMED" : r < 0.32 ? "READY_FOR_PICKUP" : r < 0.45 ? "PICKED_UP" : r < 0.6 ? "IN_TRANSIT" : r < 0.72 ? "OUT_FOR_DELIVERY" : r < 0.9 ? "DELIVERED" : "FAILED";
        else if (d <= 6) status = r < 0.55 ? "DELIVERED" : r < 0.68 ? "FAILED" : r < 0.8 ? "IN_TRANSIT" : r < 0.88 ? "OUT_FOR_DELIVERY" : r < 0.94 ? "RETURNED" : "CANCELLED";
        else status = r < 0.76 ? "DELIVERED" : r < 0.85 ? "FAILED" : r < 0.9 ? "RETURNED" : r < 0.98 ? "DELIVERED" : "CANCELLED";
        if (prepaid && status === "FAILED") status = "DELIVERED";

        const courier = chance(0.85) ? (pick(couriersByCity.get(city) ?? couriersByCity.get("Casablanca")!)) : null;
        const etaDate = new Date(createdAt.getTime() + zone.etaHours * 3600000);
        const order: any = {
          id: oId, reference: oRef, merchantId: m.id, customerId: cust.id, status, paymentMethod: prepaid ? "PREPAID" : "COD", source,
          itemsTotal, shippingFee, discount, total, codAmount,
          deliveryCity: city, deliveryAddress: cust.address ?? randomAddress(city), notes: chance(0.18) ? pick(["Appeler avant livraison", "Livrer le soir", "Fragile", "2e étage sans ascenseur"]) : null,
          courierId: ["NEW", "CONFIRMED", "READY_FOR_PICKUP", "CANCELLED"].includes(status) ? null : (courier?.id ?? null),
          attemptCount: 0, etaDate, createdAt, updatedAt: createdAt,
        };
        const ev = (type: string, at: Date, actorType = "SYSTEM", actorName: string | null = null, message?: string) => eventRows.push({ id: uid(), orderId: oId, type, actorType, actorName, message: message ?? null, createdAt: at });
        ev("CREATED", createdAt, source === "DASHBOARD" ? "MERCHANT" : "API", m.name);
        const statusDates: any = {};
        let cursor = new Date(createdAt.getTime() + int(1, 8) * 3600000);
        if (status !== "NEW") { order.confirmedAt = cursor; statusDates.confirmedAt = cursor; ev("CONFIRMED", cursor, "MERCHANT", m.name); cursor = new Date(cursor.getTime() + int(2, 12) * 3600000); }
        if (["READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(status)) { cursor = new Date(cursor.getTime() + int(2, 10) * 3600000); if (cursor > now) cursor = now; ev("READY", cursor, "MERCHANT", m.name); }
        if (["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(status) && order.courierId) {
          ev("ASSIGNED", cursor, "ADMIN", "Dispatch Masar"); cursor = new Date(cursor.getTime() + int(2, 20) * 3600000); if (cursor > now) cursor = now;
          order.pickedUpAt = cursor; statusDates.pickedUpAt = cursor; ev("PICKED_UP", cursor, "COURIER", courier ? courier.name : "Courier");
        }
        const inTransit = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(status);
        const outForDelivery = ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].includes(status);
        if (inTransit) { ev("IN_TRANSIT", cursor, "COURIER", courier?.name ?? "Courier"); cursor = new Date(cursor.getTime() + int(4, 24) * 3600000); if (cursor > now) cursor = now; }
        if (outForDelivery) { ev("OUT_FOR_DELIVERY", cursor, "COURIER", courier?.name ?? "Courier"); cursor = new Date(cursor.getTime() + int(1, 6) * 3600000); if (cursor > now) cursor = now; }

        let attempts = 0, delivered = false, returned = false;
        const deliveryId = uid();
        const hasDelivery = !["NEW", "CONFIRMED", "READY_FOR_PICKUP", "CANCELLED"].includes(status);
        if (hasDelivery) {
          const gps = citiesByFee.get(city) ?? { lat: 33.5731, lng: -7.5898 };
          const delivery: any = {
            id: deliveryId, orderId: oId, courierId: order.courierId,
            status: status === "DELIVERED" ? "DELIVERED" : status === "FAILED" ? "FAILED" : status === "RETURNED" ? "RETURNED" : status === "OUT_FOR_DELIVERY" ? "OUT_FOR_DELIVERY" : status === "IN_TRANSIT" ? "IN_TRANSIT" : "ASSIGNED",
            attempts: 0, otpCode: String(int(100000, 999999)), codCollected: 0, codStatus: "PENDING",
            gpsLat: gps.lat + (rnd() - 0.5) * 0.08, gpsLng: gps.lng + (rnd() - 0.5) * 0.08,
            pickedUpAt: statusDates.pickedUpAt ?? null, outForDeliveryAt: null, deliveredAt: null, createdAt: statusDates.pickedUpAt ?? createdAt,
          };
          // attempts
          let t = outForDelivery ? cursor : cursor;
          const maxAttempts = status === "DELIVERED" ? int(1, 3) : status === "FAILED" ? int(1, 3) : status === "RETURNED" ? 3 : 0;
          if (outForDelivery) delivery.outForDeliveryAt = outForDelivery ? cursor : null;
          for (let a = 1; a <= maxAttempts; a++) {
            attempts = a;
            const isLast = a === maxAttempts;
            const result = isLast ? (status === "DELIVERED" ? "DELIVERED" : status === "RETURNED" ? pick(["NO_ANSWER", "REFUSED"]) : pick(["NO_ANSWER", "WRONG_ADDRESS", "POSTPONED", "REFUSED", "UNREACHABLE", "OUT_OF_ZONE"])) : pick(["NO_ANSWER", "UNREACHABLE", "POSTPONED", "WRONG_ADDRESS"]);
            if (t > now) t = new Date(now.getTime() - int(1, 5) * 3600000);
            attemptRows.push({ id: uid(), deliveryId, number: a, result, reason: result === "DELIVERED" ? null : (FAIL_REASONS.find((f) => f.code === result)?.fr ?? result), courierNote: chance(0.4) ? pick(["Pas de réponse, SMS envoyé", "Le gardien n'a pas accepté le colis", "Client demande livraison demain matin", "Adresse introuvable, appel sans réponse"]) : null, proofType: result === "DELIVERED" ? pick(["OTP", "SIGNATURE", "PHOTO"]) : null, gpsLat: gps.lat + (rnd() - 0.5) * 0.08, gpsLng: gps.lng + (rnd() - 0.5) * 0.08, occurredAt: t });
            ev("ATTEMPT", t, "COURIER", courier?.name ?? "Courier", result === "DELIVERED" ? "Livré" : `Tentative ${a} : ${FAIL_REASONS.find((f) => f.code === result)?.fr ?? result}`);
            if (result === "DELIVERED") {
              delivered = true;
              delivery.deliveredAt = t; delivery.codCollected = codAmount; delivery.codStatus = "COLLECTED";
              order.deliveredAt = t; order.status = "DELIVERED"; status = "DELIVERED";
              ev("DELIVERED", t, "COURIER", courier?.name ?? "Courier");
              t = new Date(t.getTime() + 3600000);
              break;
            }
            t = new Date(t.getTime() + int(12, 40) * 3600000);
          }
          delivery.attempts = attempts;
          if (status === "FAILED") { delivery.failureReason = attemptRows[attemptRows.length - 1]?.reason ?? null; delivery.nextActionAt = new Date(now.getTime() + int(1, 3) * DAY); order.failedAt = attemptRows[attemptRows.length - 1]?.occurredAt ?? cursor; ev("FAILED", order.failedAt, "COURIER", courier?.name ?? "Courier", delivery.failureReason); }
          if (status === "RETURNED") {
            returned = true;
            const rid = uid();
            returnRows.push({ id: rid, orderId: oId, merchantId: m.id, reason: pick(RETURN_REASONS), status: "COMPLETED", courierId: order.courierId, refundAmount: 0, note: null, requestedAt: cursor, completedAt: new Date(Math.min(now.getTime(), cursor.getTime() + int(2, 5) * DAY)) });
            order.returnedAt = returnRows[returnRows.length - 1].completedAt;
            delivery.status = "RETURNED";
            ev("RETURNED", order.returnedAt, "COURIER", courier?.name ?? "Courier");
          }
          if (status === "OUT_FOR_DELIVERY" || status === "IN_TRANSIT" || status === "PICKED_UP") { /* in-flight, no terminal events */ }
          deliveryRows.push(delivery);
          order.attemptCount = attempts;
        }

        // payment
        paymentRows.push({ id: uid(), orderId: oId, method: prepaid ? "PREPAID" : "COD", amount: total, status: delivered ? "COLLECTED" : returned ? "REFUNDED" : prepaid ? "COLLECTED" : "PENDING", collectedAt: delivered ? order.deliveredAt : null });

        // COD ledger
        if (delivered && !prepaid && codAmount > 0) {
          codRows.push({ id: uid(), merchantId: m.id, orderId: oId, type: "COD_COLLECTION", amount: codAmount, status: "AVAILABLE", description: `Encaissement ${oRef}`, occurredAt: order.deliveredAt });
          codRows.push({ id: uid(), merchantId: m.id, orderId: oId, type: "DELIVERY_FEE", amount: -shippingFee, status: "AVAILABLE", description: `Frais de livraison ${oRef} (${city})`, occurredAt: order.deliveredAt });
        }
        if (returned) {
          const rz = zoneByCity.get(city)!;
          codRows.push({ id: uid(), merchantId: m.id, orderId: oId, type: "RETURN_FEE", amount: -rz.returnFee, status: "AVAILABLE", description: `Frais de retour ${oRef}`, occurredAt: order.returnedAt });
        }

        if (status === "CANCELLED") { order.cancelledAt = new Date(Math.min(now.getTime(), createdAt.getTime() + int(2, 30) * 3600000)); ev("CANCELLED", order.cancelledAt, "MERCHANT", m.name, "Annulé à la demande du client"); }

        // customer aggregates
        const c = customerRows.find((x) => x.id === cust.id)!;
        c.totalOrders += 1;
        if (delivered) c.totalSpent += total;
        if (status === "FAILED") c.failedCount += 1;
        if (returned) c.returnedCount += 1;

        orderRows.push(order);
        itemRows.push(...items);
      }
    }
  }

  // ── settlements: weekly PAID runs for weeks -8..-2 per merchant ──
  const settlementRows: any[] = [];
  for (const m of activeMerchants) {
    for (let w = 8; w >= 2; w--) {
      const end = daysAgo(w * 7), start = daysAgo(w * 7 + 7);
      const txs = codRows.filter((t) => t.merchantId === m.id && t.occurredAt >= start && t.occurredAt < end);
      if (!txs.length) continue;
      const gross = txs.filter((t) => t.type === "COD_COLLECTION").reduce((a, t) => a + t.amount, 0);
      const fees = txs.filter((t) => t.type !== "COD_COLLECTION").reduce((a, t) => a - t.amount, 0);
      const net = gross - fees;
      if (net <= 0) continue;
      const stlId = uid();
      settlementRows.push({ id: stlId, reference: `STL-2026-${String(stlCounter++).padStart(4, "0")}`, merchantId: m.id, grossCOD: gross, fees, netAmount: net, status: "PAID", method: pick(["BANK_TRANSFER", "BANK_TRANSFER", "CASH"]), periodStart: start, periodEnd: end, createdAt: end, paidAt: new Date(end.getTime() + 2 * DAY) });
      for (const t of txs) { t.status = "SETTLED"; t.settlementId = stlId; t.settledAt = end; }
      codRows.push({ id: uid(), merchantId: m.id, orderId: null, type: "SETTLEMENT", amount: -net, status: "SETTLED", description: `Versement ${`STL-2026-${String(stlCounter - 1).padStart(4, "0")}`}`, occurredAt: end, settledAt: end, settlementId: stlId });
    }
  }
  // wallet balance = sum AVAILABLE
  for (const m of merchantRows) m.walletBalance = codRows.filter((t) => t.merchantId === m.id && t.status === "AVAILABLE").reduce((a, t) => a + t.amount, 0);

  // notifications for demo merchant owner
  const demoMerchant = merchantRows.find((m) => m.slug === "zellige-store")!;
  const demoOwner = staffRows.find((st) => st.merchantId === demoMerchant.id && st.staffRole === "OWNER")!;
  const notifRows: any[] = [];
  const recentOrders = orderRows.filter((o) => o.merchantId === demoMerchant.id).slice(-8);
  for (const o of recentOrders) {
    notifRows.push({ id: uid(), userId: demoOwner.userId, merchantId: demoMerchant.id, type: o.status === "DELIVERED" ? "DELIVERED" : o.status === "FAILED" ? "FAILED" : "ORDER_CREATED", title: o.status === "DELIVERED" ? `Commande ${o.reference} livrée` : o.status === "FAILED" ? `Échec de livraison ${o.reference}` : `Nouvelle commande ${o.reference}`, body: `${o.deliveryCity} — ${(o.total / 100).toFixed(0)} DH`, channel: "IN_APP", createdAt: o.createdAt, readAt: chance(0.4) ? o.createdAt : null });
  }
  notifRows.push({ id: uid(), userId: demoOwner.userId, merchantId: demoMerchant.id, type: "SETTLEMENT_AVAILABLE", title: "Versement disponible", body: "Votre versement hebdomadaire est prêt", channel: "IN_APP", createdAt: daysAgo(1) });

  // audit logs
  const auditRows: any[] = [];
  const adminActions = [["MERCHANT_SUSPENDED", "Merchant", merchantRows.find((m) => m.slug === "tafilalet-dates")!.id, "Non-paiement des frais de retour"], ["SETTLEMENT_PAID", "Settlement", settlementRows[0]?.id, "Virement bancaire confirmé"], ["COURIER_DEACTIVATED", "Courier", courierRows[7].id, "Demande de congés"], ["PRICE_UPDATED", "Zone", zoneRows[0].id, "Casa 25→28 DH (haute saison)"]];
  for (const [action, entity, entityId, meta] of adminActions) auditRows.push({ id: uid(), actorId: adminId, actorName: "Karim El Idrissi", actorType: "ADMIN", action, entity, entityId, meta, createdAt: daysAgo(int(2, 30)) });

  // api keys / webhooks / integrations for demo merchants
  const sha = (v: string) => bcrypt.hashSync(v, 8);
  const keyRows: any[] = [], webhookRows: any[] = [], integrationRows: any[] = [];
  for (const m of [demoMerchant, merchantRows.find((x) => x.slug === "atlas-cosmetics")!]) {
    keyRows.push({ id: uid(), merchantId: m.id, name: "Production", prefix: "msk_live_" + uid().slice(0, 8), hashedKey: sha("msk_live_" + uid()), createdAt: daysAgo(60), lastUsedAt: daysAgo(1) });
    webhookRows.push({ id: uid(), merchantId: m.id, url: `https://${m.slug}.ma/webhooks/masar`, secret: "whsec_" + uid(), events: JSON.stringify(["order.created", "order.delivered", "order.failed", "return.completed"]), isActive: true, createdAt: daysAgo(60), lastFiredAt: daysAgo(1), lastStatus: 200 });
    if (m.slug === "zellige-store") integrationRows.push({ id: uid(), merchantId: m.id, platform: "SHOPIFY", status: "CONNECTED", config: JSON.stringify({ shop: "zellige-store.myshopify.com" }), lastSyncAt: daysAgo(0, false) }, { id: uid(), merchantId: m.id, platform: "WOOCOMMERCE", status: "PENDING", config: null, createdAt: daysAgo(3) });
    if (m.slug === "atlas-cosmetics") integrationRows.push({ id: uid(), merchantId: m.id, platform: "PRESTASHOP", status: "CONNECTED", config: JSON.stringify({ shop: "atlascosmetics.ma" }), lastSyncAt: daysAgo(1) });
  }

  await db.region.createMany({ data: regionRows });
  await db.city.createMany({ data: cityRows });
  await db.zone.createMany({ data: zoneRows });
  await db.user.createMany({ data: userRows });
  await db.merchant.createMany({ data: merchantRows });
  await db.merchantStaff.createMany({ data: staffRows });
  await db.courier.createMany({ data: courierRows });
  await db.customer.createMany({ data: customerRows });
  await db.address.createMany({ data: addressRows });
  await db.product.createMany({ data: productRows });

  // chunk large inserts (SQLite parameter limit)
  const chunk = <T,>(arr: T[], n = 200): T[][] => arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : [];
  for (const part of chunk(orderRows)) await db.order.createMany({ data: part });
  for (const part of chunk(itemRows)) await db.orderItem.createMany({ data: part });
  for (const part of chunk(eventRows)) await db.orderEvent.createMany({ data: part });
  for (const part of chunk(deliveryRows)) await db.delivery.createMany({ data: part });
  for (const part of chunk(attemptRows)) await db.deliveryAttempt.createMany({ data: part });
  for (const part of chunk(paymentRows)) await db.payment.createMany({ data: part });
  for (const part of chunk(returnRows)) await db.return.createMany({ data: part });
  for (const part of chunk(codRows)) await db.codTransaction.createMany({ data: part });
  await db.settlement.createMany({ data: settlementRows });
  await db.notification.createMany({ data: notifRows });
  await db.auditLog.createMany({ data: auditRows });
  await db.apiKey.createMany({ data: keyRows });
  await db.webhook.createMany({ data: webhookRows });
  await db.integration.createMany({ data: integrationRows });
  await db.pickupPoint.createMany({ data: [
    { name: 'Relais Maârif', city: 'Casablanca', address: 'Angle Bd Anfa / Rue Moussa Bnou Noussair, Maârif', phone: '+212522123401', lat: 33.5883, lng: -7.6318, isActive: true },
    { name: 'Relais Hay Riad', city: 'Rabat', address: 'Av. Annakhil, Hay Riad', phone: '+212537123402', lat: 33.9585, lng: -6.8761, isActive: true },
    { name: 'Relais Guéliz', city: 'Marrakech', address: 'Av. Mohammed V, Guéliz', phone: '+212524123403', lat: 31.6362, lng: -8.0089, isActive: true },
    { name: 'Relais Ville Nouvelle', city: 'Fès', address: 'Av. Hassan II, Ville Nouvelle', phone: '+212535123404', lat: 34.0331, lng: -5.0003, isActive: true },
    { name: 'Relais Iberia', city: 'Tanger', address: 'Av. Mohammed VI, Iberia', phone: '+212539123405', lat: 35.7643, lng: -5.8336, isActive: true },
    { name: 'Relais Talborjt', city: 'Agadir', address: 'Rue de Marrakech, Talborjt', phone: '+212528123406', lat: 30.4223, lng: -9.5986, isActive: true },
  ] });
  await db.setting.createMany({ data: [
    { key: "weight_surcharge_per_kg", value: "500" },
    { key: "remote_multiplier", value: "1.25" },
    { key: "cod_fee_pct", value: "0" },
    { key: "courier_fee_default", value: "1400" },
  ] });

  // courier "today" scenario for the demo courier (Casablanca)
  const demoCourier = courierRows.find((c) => c.employeeCode === "MSR-C001")!;
  const dmOrders = orderRows.filter((o) => o.merchantId === demoMerchant.id && o.deliveryCity === "Casablanca" && ["CONFIRMED", "READY_FOR_PICKUP"].includes(o.status)).slice(0, 4);
  for (let i = 0; i < dmOrders.length; i++) {
    const o = dmOrders[i];
    await db.order.update({ where: { id: o.id }, data: { courierId: demoCourier.id, status: "OUT_FOR_DELIVERY", pickedUpAt: new Date(now.getTime() - 3 * 3600000) } });
    await db.delivery.updateMany({ where: { orderId: o.id }, data: { courierId: demoCourier.id, status: "OUT_FOR_DELIVERY", pickedUpAt: new Date(now.getTime() - 3 * 3600000), outForDeliveryAt: new Date(now.getTime() - 90 * 60000) } });
    await db.orderEvent.create({ data: { id: uid(), orderId: o.id, type: "OUT_FOR_DELIVERY", actorType: "COURIER", actorName: demoCourier.name, message: "En tournée", createdAt: new Date(now.getTime() - 90 * 60000) } });
  }
  const readyToday = orderRows.filter((o) => o.merchantId === demoMerchant.id && o.status === "READY_FOR_PICKUP").slice(0, 3);
  for (const o of readyToday) await db.order.update({ where: { id: o.id }, data: { courierId: demoCourier.id } });

  console.log(`✔ ${regionRows.length} regions, ${cityRows.length} cities, ${zoneRows.length} zones`);
  console.log(`✔ ${merchantRows.length} merchants, ${courierRows.length} couriers, ${customerRows.length} customers, ${productRows.length} products`);
  console.log(`✔ ${orderRows.length} orders, ${deliveryRows.length} deliveries, ${returnRows.length} returns, ${codRows.length} COD transactions, ${settlementRows.length} settlements`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
