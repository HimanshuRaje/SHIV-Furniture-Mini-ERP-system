const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // ─── USERS ───
  const passwordHash = await bcrypt.hash('admin123', 10);
  const salesHash = await bcrypt.hash('sales123', 10);
  const purchaseHash = await bcrypt.hash('purchase123', 10);
  const mfgHash = await bcrypt.hash('mfg123', 10);
  const ownerHash = await bcrypt.hash('owner123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@shiverp.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@shiverp.com',
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@shiverp.com' },
    update: {},
    create: {
      name: 'Sales User',
      email: 'sales@shiverp.com',
      passwordHash: salesHash,
      role: 'SALES_USER',
    },
  });

  const purchaseUser = await prisma.user.upsert({
    where: { email: 'purchase@shiverp.com' },
    update: {},
    create: {
      name: 'Purchase User',
      email: 'purchase@shiverp.com',
      passwordHash: purchaseHash,
      role: 'PURCHASE_USER',
    },
  });

  const mfgUser = await prisma.user.upsert({
    where: { email: 'mfg@shiverp.com' },
    update: {},
    create: {
      name: 'Arjun Mehta',
      email: 'mfg@shiverp.com',
      passwordHash: mfgHash,
      role: 'MANUFACTURING_USER',
    },
  });

  const mfgHash2 = await bcrypt.hash('mfg456', 10);
  const mfgUser2 = await prisma.user.upsert({
    where: { email: 'mfg2@shiverp.com' },
    update: {},
    create: {
      name: 'Ravi Sharma',
      email: 'mfg2@shiverp.com',
      passwordHash: mfgHash2,
      role: 'MANUFACTURING_USER',
    },
  });

  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@shiverp.com' },
    update: {},
    create: {
      name: 'Business Owner',
      email: 'owner@shiverp.com',
      passwordHash: ownerHash,
      role: 'BUSINESS_OWNER',
    },
  });

  const prodHash = await bcrypt.hash('prod123', 10);
  const prodUser = await prisma.user.upsert({
    where: { email: 'prodmanager@shiverp.com' },
    update: {},
    create: {
      name: 'Product Manager',
      email: 'prodmanager@shiverp.com',
      passwordHash: prodHash,
      role: 'PRODUCT_MANAGER',
    },
  });

  console.log('Users seeded');

  // ─── VENDOR ───
  let vendor = await prisma.vendor.findFirst({ where: { name: 'RawMat Suppliers' } });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: 'RawMat Suppliers',
        contact: '+91 9876543210',
        email: 'rawmat@suppliers.com',
      },
    });
  }
  console.log('Vendor seeded');

  // ─── PRODUCTS ───
  const woodenTable = await prisma.product.upsert({
    where: { sku: 'FURN-TBL-001' },
    update: {},
    create: {
      name: 'Wooden Table',
      sku: 'FURN-TBL-001',
      category: 'Furniture',
      salesPrice: 15000,
      costPrice: 8000,
      onHandQty: 5,
      reservedQty: 0,
      procurementStrategy: 'MTO',
      procurementType: 'MANUFACTURING',
      reorderPoint: 3,
    },
  });

  const officeChair = await prisma.product.upsert({
    where: { sku: 'FURN-CHR-001' },
    update: {},
    create: {
      name: 'Office Chair',
      sku: 'FURN-CHR-001',
      category: 'Furniture',
      salesPrice: 8000,
      costPrice: 4500,
      onHandQty: 20,
      reservedQty: 0,
      procurementStrategy: 'MTS',
      procurementType: 'PURCHASE',
      reorderPoint: 10,
      vendorId: vendor.id,
    },
  });

  const diningTable = await prisma.product.upsert({
    where: { sku: 'FURN-DTB-001' },
    update: {},
    create: {
      name: 'Dining Table',
      sku: 'FURN-DTB-001',
      category: 'Furniture',
      salesPrice: 25000,
      costPrice: 12000,
      onHandQty: 3,
      reservedQty: 0,
      procurementStrategy: 'MTO',
      procurementType: 'MANUFACTURING',
      reorderPoint: 2,
    },
  });

  const woodenLegs = await prisma.product.upsert({
    where: { sku: 'COMP-LEG-001' },
    update: {},
    create: {
      name: 'Wooden Legs',
      sku: 'COMP-LEG-001',
      category: 'Components',
      salesPrice: 500,
      costPrice: 200,
      onHandQty: 100,
      reservedQty: 0,
      procurementStrategy: 'MTS',
      procurementType: 'PURCHASE',
      reorderPoint: 20,
      vendorId: vendor.id,
    },
  });

  const woodenTop = await prisma.product.upsert({
    where: { sku: 'COMP-TOP-001' },
    update: {},
    create: {
      name: 'Wooden Top',
      sku: 'COMP-TOP-001',
      category: 'Components',
      salesPrice: 2000,
      costPrice: 1000,
      onHandQty: 50,
      reservedQty: 0,
      procurementStrategy: 'MTS',
      procurementType: 'PURCHASE',
      reorderPoint: 10,
      vendorId: vendor.id,
    },
  });

  const screws = await prisma.product.upsert({
    where: { sku: 'COMP-SCR-001' },
    update: {},
    create: {
      name: 'Screws (Box of 100)',
      sku: 'COMP-SCR-001',
      category: 'Components',
      salesPrice: 100,
      costPrice: 40,
      onHandQty: 500,
      reservedQty: 0,
      procurementStrategy: 'MTS',
      procurementType: 'PURCHASE',
      reorderPoint: 100,
      vendorId: vendor.id,
    },
  });

  console.log('Products seeded');

  // ─── BOM FOR WOODEN TABLE ───
  const existingBom = await prisma.bom.findFirst({
    where: { productId: woodenTable.id },
  });

  let bom;
  if (!existingBom) {
    bom = await prisma.bom.create({
      data: {
        productId: woodenTable.id,
        notes: 'Standard Wooden Table assembly',
        components: {
          create: [
            { componentProductId: woodenLegs.id, qty: 4 },
            { componentProductId: woodenTop.id, qty: 1 },
            { componentProductId: screws.id, qty: 12 },
          ],
        },
        operations: {
          create: [
            { name: 'Cut Wood', durationMins: 60, workCenter: 'Cutting Station' },
            { name: 'Assembly', durationMins: 120, workCenter: 'Assembly Line' },
            { name: 'Finishing', durationMins: 45, workCenter: 'Finishing Bay' },
          ],
        },
      },
    });
  } else {
    bom = existingBom;
  }

  console.log('BoM seeded');

  // ─── INITIAL STOCK LEDGER ENTRIES ───
  const products = [
    { product: woodenTable, qty: 5 },
    { product: officeChair, qty: 20 },
    { product: diningTable, qty: 3 },
    { product: woodenLegs, qty: 100 },
    { product: woodenTop, qty: 50 },
    { product: screws, qty: 500 },
  ];

  for (const { product, qty } of products) {
    const existingEntry = await prisma.stockLedger.findFirst({
      where: {
        productId: product.id,
        reference: 'INITIAL_STOCK',
      },
    });

    if (!existingEntry) {
      await prisma.stockLedger.create({
        data: {
          productId: product.id,
          movementType: 'ADJUSTMENT',
          qtyChange: qty,
          reference: 'INITIAL_STOCK',
          referenceType: 'SYSTEM',
          createdById: admin.id,
        },
      });
    }
  }

  console.log('Stock ledger entries seeded');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
