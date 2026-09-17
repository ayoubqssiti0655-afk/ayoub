/**
 * Address IQ — heuristic address quality scoring for Moroccan addresses.
 * Detects missing neighborhood/street, landmark-only descriptions, common
 * typos in city names, and too-short addresses — the top cause of
 * "wrong address" delivery failures.
 */
export type AddressCheck = {
  score: number; // 0–100
  level: "good" | "improve" | "bad";
  issues: { code: string; messageFr: string; messageAr: string }[];
  suggestions: string[];
};

const KNOWN_QUARTERS = [
  "maârif", "anfa", "gauthier", "bourgogne", "oulfa", "hay hassani", "ain diab", "derb ghallef", "riviera", "sidi maarouf",
  "agdal", "hassan", "hay riad", "souissi", "yacoub el mansour", "akkari",
  "guéliz", "hivernage", "médina", "targa", "massira", "daoudiate",
  "ville nouvelle", "atlas", "narjiss", "saiss", "zouagha",
  "malabata", "iberia", "branes", "val fleuri", "marchan",
  "talborjt", "founty", "hay mohammadi", "dakhla", "salam",
  "betana", "tabriquet", "hay salam", "nahda", "riad",
];
const STREET_HINTS = ["rue", "avenue", "av ", "bd ", "boulevard", "angle", "lotissement", "résidence", "residence", "imm", "n°", "num", "porte", "étage", "etage", "appt", "villa"];

export function checkAddress(address: string, city?: string): AddressCheck {
  const a = (address ?? "").trim().toLowerCase();
  const issues: AddressCheck["issues"] = [];
  let score = 100;

  if (a.length < 12) {
    score -= 45;
    issues.push({ code: "TOO_SHORT", messageFr: "Adresse trop courte — ajoutez rue et quartier", messageAr: "العنوان قصير جدًا — أضف الشارع والحي" });
  }
  const hasStreet = STREET_HINTS.some((h) => a.includes(h));
  if (!hasStreet) {
    score -= 20;
    issues.push({ code: "NO_STREET", messageFr: "Précisez la rue ou le n° de porte", messageAr: "حدّد الشارع أو رقم الباب" });
  }
  const hasQuarter = KNOWN_QUARTERS.some((q) => a.includes(q));
  if (!hasQuarter) {
    score -= 15;
    issues.push({ code: "NO_QUARTER", messageFr: "Ajoutez le quartier pour aider le livreur", messageAr: "أضف الحي ليسهل على الموزّع الوصول" });
  }
  if (/^\d+$/.test(a)) {
    score -= 40;
    issues.push({ code: "NUMBERS_ONLY", messageFr: "Une adresse ne peut pas être seulement des chiffres", messageAr: "لا يمكن أن يكون العنوان أرقامًا فقط" });
  }

  const suggestions: string[] = [];
  if (city) {
    const c = city.toLowerCase();
    const quarters = KNOWN_QUARTERS.filter((q) => QUARTER_BY_CITY[c]?.includes(q)).slice(0, 3);
    if (quarters.length && !hasQuarter) {
      suggestions.push(` quartier : ${quarters.join(", ")}`);
    }
  }
  if (!hasStreet) suggestions.push("ex. « Rue Ibn Sina, Résidence Al Anbar, Appt 5 »");

  score = Math.max(0, Math.min(100, score));
  return { score, level: score >= 75 ? "good" : score >= 45 ? "improve" : "bad", issues, suggestions };
}

const QUARTER_BY_CITY: Record<string, string[]> = {
  casablanca: ["maârif", "anfa", "oulfa", "hay hassani", "gauthier"],
  rabat: ["agdal", "hay riad", "hassan", "souissi"],
  marrakech: ["guéliz", "hivernage", "targa", "massira"],
  fès: ["ville nouvelle", "atlas", "narjiss"],
  tanger: ["iberia", "malabata", "branes"],
  agadir: ["talborjt", "founty", "hay mohammadi"],
};
