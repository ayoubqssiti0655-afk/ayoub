import { db } from "@/server/db";
import { uid } from "@/lib/utils";

/** Seed a few PickupPoints if none exist (idempotent). */
export async function ensurePickupPoints() {
  const count = await db.pickupPoint.count();
  if (count > 0) return;
  const points = [
    { name: "Relais Maârif", city: "Casablanca", address: "Angle Bd Anfa / Rue Moussa Bnou Noussair, Maârif", phone: "+212522123401", lat: 33.5883, lng: -7.6318 },
    { name: "Relais Hay Riad", city: "Rabat", address: "Av. Annakhil, Hay Riad, près de Megamall", phone: "+212537123402", lat: 33.9585, lng: -6.8761 },
    { name: "Relais Guéliz", city: "Marrakech", address: "Av. Mohammed V, Guéliz", phone: "+212524123403", lat: 31.6362, lng: -8.0089 },
    { name: "Relais Ville Nouvelle", city: "Fès", address: "Av. Hassan II, Ville Nouvelle", phone: "+212535123404", lat: 34.0331, lng: -5.0003 },
    { name: "Relais Iberia", city: "Tanger", address: "Av. Mohammed VI, Iberia", phone: "+212539123405", lat: 35.7643, lng: -5.8336 },
    { name: "Relais Talborjt", city: "Agadir", address: "Rue de Marrakech, Talborjt", phone: "+212528123406", lat: 30.4223, lng: -9.5986 },
  ];
  await db.pickupPoint.createMany({ data: points.map((p) => ({ ...p, id: uid(), isActive: true })) });
}
