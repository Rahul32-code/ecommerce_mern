import Coupon from "../modals/coupon.model.js";
import { stripe } from "../lib/stripe.js"; // ✅ Fixed import to match named export
import Order from "../modals/order.modal.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Invalid or empty products array" });
    }

    let totalAmount = 0;

    const lineItems = products.map((product) => {
      const amount = Math.round(product.price * 100); // stripe wants amount in cents
      totalAmount += amount * product.quantity;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            images: [product.image],
          },
          unit_amount: amount,
        },
        quantity: product.quantity, // ✅ Missing quantity in original code
      };
    });

    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id,
        isActive: true,
      });
      if (coupon) {
        totalAmount = Math.round(totalAmount * (1 - coupon.discountPercentage / 100)); // ✅ Corrected formula
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // ❌ Stripe does not support 'paypal' directly
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`, // ✅ Fixed typo: 'puchase' -> 'purchase'
      discounts: coupon
        ? [{ coupon: await createStripeCoupon(coupon.discountPercentage) }]
        : [],
      metadata: {
        userId: req.user._id.toString(),
        couponCode: couponCode || "",
        products: JSON.stringify(
          products.map((p) => ({
            id: p._id,
            quantity: p.quantity,
            price: p.price,
          }))
        ),
      },
    });

    if (totalAmount >= 20000) {
      await createdCoupon(req.user._id);
    }

    res.status(200).json({
      sessionId: session.id,
      totalAmount: totalAmount / 100, // convert back to dollars
    });
  } catch (error) {
    console.log(`Error creating checkout session: ${error}`);
    res.status(500).json({ message: "Server error" });
  }
};

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      if (session.metadata.couponCode) {
        await Coupon.findOneAndUpdate(
          {
            code: session.metadata.couponCode,
            userId: session.metadata.userId,
          },
          { isActive: false } // ❗This should probably deactivate the coupon
        );
      }

      // Create new order
      const products = JSON.parse(session.metadata.products);
      const newOrder = await Order.create({
        user: session.metadata.userId,
        products: products.map((product) => ({
          product: product.id,
          quantity: product.quantity,
          price: product.price,
        })),
        totalAmount: session.amount_total / 100,
        stripeSessionId: session.id,
      });

      await newOrder.save();

      res.json({
        success: true,
        message: "Order created successfully",
        orderId: newOrder._id,
      });
    } else {
      res.status(400).json({ message: "Payment not completed" });
    }
  } catch (error) {
    console.error("Error creating order", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create Stripe Coupon on the fly
async function createStripeCoupon(discountPercentage) {
  const stripeCoupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });
  return stripeCoupon.id;
}

// Create in-app Coupon for user
async function createdCoupon(userId) {
  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(), // ✅ Fixed typo
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userId,
  });

  await newCoupon.save();
  return newCoupon;
}
