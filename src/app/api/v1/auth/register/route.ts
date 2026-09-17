import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { hashPassword, createSession } from "@/lib/auth";
import { api, parseBody, ok, badRequest } from "@/lib/api";
import { audit } from "@/server/audit";

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().regex(/^(\+212[67]\d{8}|0[67]\d{8})$/, "Invalid Moroccan phone"),
  city: z.string().min(2),
  password: z.string().min(8).max(100),
  accountType: z.enum(["MERCHANT", "COURIER"]).default("MERCHANT"),
  vehicle: z.enum(["MOTORCYCLE", "CAR", "VAN"]).optional().default("MOTORCYCLE"),
});

export const POST = api(
  async (req: NextRequest) => {
    const data = await parseBody(req, registerSchema);
    const email = data.email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) throw badRequest("This email is already registered");

    if (data.accountType === "COURIER") {
      const count = await db.courier.count();
      const user = await db.user.create({
        data: {
          email,
          passwordHash: await hashPassword(data.password),
          name: data.name,
          role: "COURIER",
          phone: data.phone.replace(/^0/, "+212"),
        },
      });
      const courier = await db.courier.create({
        data: {
          userId: user.id,
          employeeCode: `MSR-C${String(count + 1).padStart(3, "0")}`,
          vehicle: data.vehicle ?? "MOTORCYCLE",
          homeCity: data.city,
          zones: JSON.stringify([data.city]),
          status: "ACTIVE",
        },
      });
      await db.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Bienvenue dans l'équipe Masar",
          body: "Votre compte livreur est activé. Vous pouvez dès maintenant gérer vos livraisons.",
        },
      });
      await createSession({ sub: user.id, role: "COURIER", courierId: courier.id, name: user.name });
      await audit({ actorId: user.id, actorName: user.name, actorType: "COURIER", action: "COURIER_REGISTERED", entity: "Courier", entityId: courier.id, meta: user.name });

      return ok({ courierId: courier.id, redirect: "/courier" });
    }

    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const user = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(data.password),
        name: data.name,
        role: "MERCHANT",
        phone: data.phone.replace(/^0/, "+212"),
      },
    });
    const merchant = await db.merchant.create({
      data: {
        name: data.name,
        slug,
        email,
        phone: data.phone.replace(/^0/, "+212"),
        city: data.city,
        status: "ACTIVE",
        plan: "starter",
      },
    });
    await db.merchantStaff.create({ data: { userId: user.id, merchantId: merchant.id, staffRole: "OWNER" } });
    await db.notification.create({
      data: {
        userId: user.id,
        merchantId: merchant.id,
        type: "SYSTEM",
        title: "Bienvenue sur Masar",
        body: "Créez votre première commande ou connectez votre boutique.",
      },
    });
    await createSession({ sub: user.id, role: "MERCHANT", merchantId: merchant.id, name: user.name });
    await audit({ actorId: user.id, actorName: user.name, actorType: "MERCHANT", action: "MERCHANT_REGISTERED", entity: "Merchant", entityId: merchant.id, meta: merchant.name });

    return ok({ merchantId: merchant.id, redirect: "/app" });
  },
  { public: true, rate: { limit: 10, windowMs: 60000 } }
);
