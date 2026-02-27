/* ══════════════════════════════════════════════════════════
   routes/contact.js
   Contact & feedback API  —  /api/contact/*

   Endpoints:
     POST   /send      Send message from contact form
     POST   /visit     Track page visit (analytics)
     GET    /stats     Public stats (visit counts)
══════════════════════════════════════════════════════════ */

const router       = require('express').Router();
const { body }     = require('express-validator');
const rateLimit    = require('express-rate-limit');

const validate     = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const logger       = require('../config/logger');

/* In-memory visit counter (replace with DB in production) */
const visitCounts = {};

/* ── Contact rate limiter (5 messages per 15 min per IP) ── */
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many messages. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ══════════════════════════════════════════════════════════
   POST /api/contact/send
   Accepts a contact form submission
══════════════════════════════════════════════════════════ */
router.post(
  '/send',
  contactLimiter,
  [
    body('name').trim().notEmpty().isLength({ max: 80 }).escape()
      .withMessage('Name is required (max 80 chars)'),
    body('email').isEmail().normalizeEmail()
      .withMessage('Valid email is required'),
    body('message').trim().notEmpty().isLength({ min: 10, max: 2000 })
      .withMessage('Message must be 10–2000 characters'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    logger.info('Contact form received', {
      name, email,
      msgLen: message.length,
      ip: req.ip,
      requestId: req.id,
    });

    /* In production: send via emailService.sendContactNotification(...) */
    /* For now: log and acknowledge */

    res.status(200).json({
      success: true,
      message: 'Message received. Thank you for reaching out!',
    });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/contact/visit
   Track anonymous page visit
══════════════════════════════════════════════════════════ */
router.post(
  '/visit',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  [
    body('page').trim().notEmpty().isLength({ max: 60 })
      .withMessage('Page name required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const page = req.body.page.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    visitCounts[page] = (visitCounts[page] || 0) + 1;

    logger.debug('Page visit tracked', { page, count: visitCounts[page], requestId: req.id });

    res.json({ success: true, page, visits: visitCounts[page] });
  })
);

/* ══════════════════════════════════════════════════════════
   GET /api/contact/stats
   Return public site stats
══════════════════════════════════════════════════════════ */
router.get('/stats', asyncHandler(async (req, res) => {
  const total = Object.values(visitCounts).reduce((a, b) => a + b, 0);
  res.json({
    success: true,
    data: {
      totalVisits: total,
      pages: visitCounts,
      uptime: `${Math.round(process.uptime())}s`,
    },
  });
}));

module.exports = router;
