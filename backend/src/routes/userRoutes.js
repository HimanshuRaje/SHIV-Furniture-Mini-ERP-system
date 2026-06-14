const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const prisma = require('../lib/prisma');

router.use(authenticate);

/**
 * GET /api/users
 * Returns all users, optionally filtered by role query param.
 * e.g. GET /api/users?role=MANUFACTURING_USER
 */
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.role) where.role = req.query.role;

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
});

module.exports = router;
