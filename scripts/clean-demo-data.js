const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  console.log("Starting demo data cleanup...");

  // Verify admin user
  const adminUser = await db.user.findFirst({
    where: { email: "admin@masar.ma" },
  });

  if (!adminUser) {
    console.error("Admin user admin@masar.ma not found! Aborting for safety.");
    process.exit(1);
  }

  console.log("Preserving Admin account:", adminUser.email, `(id: ${adminUser.id})`);

  // 1. Delete events, logs, ratings
  console.log("Deleting delivery attempts, ratings, and events...");
  await db.deliveryRating.deleteMany({});
  await db.deliveryAttempt.deleteMany({});
  await db.orderEvent.deleteMany({});
  await db.webhookDelivery.deleteMany({});

  // 2. Delete tickets & disputes
  console.log("Deleting ticket messages, tickets & disputes...");
  await db.ticketMessage.deleteMany({});
  await db.ticket.deleteMany({});
  await db.dispute.deleteMany({});

  // 3. Delete payments & returns
  console.log("Deleting payments & returns...");
  await db.payment.deleteMany({});
  await db.return.deleteMany({});

  // 4. Delete bags, deposits, deliveries
  console.log("Deleting bags, courier deposits & deliveries...");
  await db.bag.deleteMany({});
  await db.courierDeposit.deleteMany({});
  await db.delivery.deleteMany({});

  // 5. Delete cod transactions & settlements
  console.log("Deleting cod transactions & settlements...");
  await db.codTransaction.deleteMany({});
  await db.settlement.deleteMany({});

  // 6. Delete order items & orders
  console.log("Deleting order items & orders...");
  await db.orderItem.deleteMany({});
  await db.order.deleteMany({});

  // 7. Delete customer addresses, customers, promo codes, products
  console.log("Deleting addresses, customers, promo codes & products...");
  await db.promoCode.deleteMany({});
  await db.address.deleteMany({});
  await db.customer.deleteMany({});
  await db.product.deleteMany({});

  // 8. Delete api keys, webhooks, integrations
  console.log("Deleting api keys, webhooks, integrations...");
  await db.apiKey.deleteMany({});
  await db.webhook.deleteMany({});
  await db.integration.deleteMany({});

  // 9. Delete merchant staff & couriers
  console.log("Deleting merchant staff & couriers...");
  await db.merchantStaff.deleteMany({});
  await db.courier.deleteMany({});

  // 10. Delete merchants
  console.log("Deleting merchants...");
  await db.merchant.deleteMany({});

  // 11. Delete notifications & audit logs
  console.log("Deleting notifications & audit logs...");
  await db.notification.deleteMany({});
  await db.auditLog.deleteMany({});

  // 12. Delete non-admin users
  console.log("Deleting non-admin users...");
  const deletedUsers = await db.user.deleteMany({
    where: {
      id: { not: adminUser.id },
    },
  });
  console.log(`Deleted ${deletedUsers.count} demo users. Kept admin: ${adminUser.email}`);

  // 13. Clean demo merchant settings
  console.log("Cleaning demo merchant settings...");
  await db.setting.deleteMany({
    where: {
      OR: [
        { key: { startsWith: "merchant_" } },
        { key: { startsWith: "demo_" } },
      ],
    },
  });

  const remainingUsers = await db.user.findMany({ select: { id: true, email: true, role: true } });
  const remainingMerchants = await db.merchant.count();
  const remainingOrders = await db.order.count();
  const remainingCouriers = await db.courier.count();
  const remainingCities = await db.city.count();
  const remainingRegions = await db.region.count();

  console.log("\n=========================================");
  console.log("✅ CLEANUP COMPLETED SUCCESSFULLY");
  console.log("=========================================");
  console.log("Remaining Users:", remainingUsers);
  console.log("Remaining Merchants:", remainingMerchants);
  console.log("Remaining Couriers:", remainingCouriers);
  console.log("Remaining Orders:", remainingOrders);
  console.log("Remaining Moroccan Cities:", remainingCities);
  console.log("Remaining Moroccan Regions:", remainingRegions);
  console.log("=========================================\n");
}

main()
  .catch((e) => {
    console.error("Error during cleanup:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
