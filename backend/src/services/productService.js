const prisma = require('../lib/prisma');

/**
 * Get all products with vendor info and computed freeToUseQty
 */
const getAllProducts = async () => {
  const products = await prisma.product.findMany({
    include: {
      vendor: true,
    },
    orderBy: { name: 'asc' },
  });

  return products.map((product) => ({
    ...product,
    freeToUseQty: product.onHandQty - product.reservedQty,
  }));
};

/**
 * Get single product by ID with vendor, boms, and computed freeToUseQty
 */
const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      vendor: true,
      boms: {
        include: {
          components: {
            include: {
              componentProduct: true,
            },
          },
          operations: true,
        },
      },
    },
  });

  if (!product) return null;

  return {
    ...product,
    freeToUseQty: product.onHandQty - product.reservedQty,
  };
};

/**
 * Create a new product
 */
const createProduct = async (data) => {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      category: data.category,
      type: data.type || 'Standard',
      status: data.status || 'Active',
      salesPrice: data.salesPrice,
      costPrice: data.costPrice,
      onHandQty: data.onHandQty || 0,
      reservedQty: data.reservedQty || 0,
      procurementStrategy: data.procurementStrategy || 'MTS',
      procurementType: data.procurementType || 'PURCHASE',
      reorderPoint: data.reorderPoint || 0,
      vendorId: data.vendorId || null,
    },
    include: { vendor: true },
  });

  return {
    ...product,
    freeToUseQty: product.onHandQty - product.reservedQty,
  };
};

/**
 * Update product by ID
 */
const updateProduct = async (id, data) => {
  const updateData = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.salesPrice !== undefined) updateData.salesPrice = data.salesPrice;
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
  if (data.onHandQty !== undefined) updateData.onHandQty = data.onHandQty;
  if (data.reservedQty !== undefined) updateData.reservedQty = data.reservedQty;
  if (data.procurementStrategy !== undefined) updateData.procurementStrategy = data.procurementStrategy;
  if (data.procurementType !== undefined) updateData.procurementType = data.procurementType;
  if (data.reorderPoint !== undefined) updateData.reorderPoint = data.reorderPoint;
  if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { vendor: true },
  });

  return {
    ...product,
    freeToUseQty: product.onHandQty - product.reservedQty,
  };
};

/**
 * Delete product by ID
 */
const deleteProduct = async (id) => {
  return prisma.product.delete({
    where: { id },
  });
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
