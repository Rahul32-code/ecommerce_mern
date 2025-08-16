import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getAnalyticsData, getDailySales } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, async (req, res) => {
    try {
        const analyticsData = await getAnalyticsData();

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const dailySales = await getDailySales(startDate, endDate);

        res.json({ analyticsData, dailySales });

    } catch (error) {
        console.log(`Error getting analytics data: ${error}`);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;