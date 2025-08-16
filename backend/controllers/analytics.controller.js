import order from "../modals/order.modal.js";

export const getAnalyticsData = async () => {
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();

  const salesData = await Order.aggregate([
    {
      $group: {
        _id: null, //it group all documents together
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const { totalSales, totalRevenue } = salesData[0] || {
    totalSales: 0,
    totalRevenue: 0,
  };

  return { user: totalUsers, Product: totalProducts, totalSales, totalRevenue };
};

export const getDailySales = async (startDate, endDate) => {
  try {
    const dailySales = await order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sale: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    // example of daily sales data
    // [
    //   {
    //     _id: "2023-08-01",
    //     sale: 1,
    //     revenue: 10
    //   },
    // ...
    // ]

    const dateArray = getDatesInRange(startDate, endDate);
    //   console.log(dateArray); // ['2023-08-01', '2023-08-02', '2023-08-03', ....]

    return dateArray.map((date) => {
      const dailySale = dailySales.find((sale) => sale._id === date);
      return {
        date,
        sale: dailySale ? dailySale.sale : 0,
        revenue: dailySale ? dailySale.revenue : 0,
      };
    });
  } catch (error) {
    console.log(`Error getting daily sales: ${error}`);
    throw error;
  }
};
function getDatesInRange(startDate, endDate) {
  const currentDate = new Date(startDate.getTime());
  const dates = [];

  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}
