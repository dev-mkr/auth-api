const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");

router.get("", authMiddleware, (req, res) => {
  const getRandom12Numbers = () =>
    Array.from({ length: 12 }, () => Math.floor(Math.random() * 1001));

  res.json({
    summary: {
      total_revenue: 4523189,
      total_revenue_percentage: "+20.1%",
      subscriptions: 2350,
      subscriptions_percentage: "+180.1%",
      sales: 12234,
      sales_percentage: "+19%",
      active_now: 573,
      active_now_percentage: "+20.1%",
      total_revenue_graph: [169, 20, 752, 856, 621, 668, 270, 152, 967, 396, 438, 305],
      subscriptions_graph: [874, 916, 160, 529, 638, 995, 116, 315, 173, 481, 228, 736],
      sales_graph: [832, 220, 136, 517, 604, 46, 810, 934, 25, 104, 808, 852],
      active_now_graph: [697, 14, 918, 450, 723, 605, 991, 208, 607, 248, 310, 856],
    },
  });
});

module.exports = router;
