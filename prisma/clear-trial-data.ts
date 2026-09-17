import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_CLEAR_TRIAL_DATA !== "YES") {
    throw new Error("Set CONFIRM_CLEAR_TRIAL_DATA=YES to clear trial data.");
  }

  console.log("Clearing trial data while preserving geography and pricing settings...");
  await db.$transaction([
    db.webhookDelivery.deleteMany(),
    db.webhook.deleteMany(),
    db.apiKey.deleteMany(),
    db.integration.deleteMany(),
    db.notification.deleteMany(),
    db.auditLog.deleteMany(),
    db.settlement.deleteMany(),
    db.codTransaction.deleteMany(),
    db.payment.deleteMany(),
    db.return.deleteMany(),
    db.deliveryRating.deleteMany(),
    db.deliveryAttempt.deleteMany(),
    db.delivery.deleteMany(),
    db.orderEvent.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.address.deleteMany(),
    db.product.deleteMany(),
    db.customer.deleteMany(),
    db.courierDeposit.deleteMany(),
    db.bag.deleteMany(),
    db.merchantStaff.deleteMany(),
    db.courier.deleteMany(),
    db.merchant.deleteMany(),
    db.user.deleteMany(),
  ]);
  console.log("Trial data cleared. Regions, cities, zones, and settings were preserved.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
