import { json } from "express";
import product from "../modals/product.modal.js";
import cloudinary from "../lib/cloudniary.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await product.find({});
    res.json({ products });
  } catch (error) {
    console.log(`Error getting products: ${error}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    const featuredProducts = await reddish.get("featured_products");
    if (featuredProducts) {
      return res.json({ products: json.parse(featuredProducts) });
    }

    // if not in reddish , fetch from mongodb
    // lean() is used to convert the mongoose object to a plain javascript object
    // which is good for performance
    featuredProducts = await product.find({ isFeatuured: true }).lean();

    if (!featuredProducts)
      return res.status(404).json({ message: "No featured products found" });

    // store in reddish for future access
    await reddish.set("featured_products", json.stringyfy(featuredProducts));

    res.json({ products: featuredProducts });
  } catch (error) {
    console.log(`Error getting featured products: ${error}`);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProductsByCategory = async (req, res) => {
    const {category} = req.params;
    try {
        const products = await product.find({category});
        res.json({products});
    } catch (error) {
        console.log(`Error getting products by category: ${error}`);
        res.status(500).json({ message: "Server error" });
    }
};

export const getRecommendatedProducts = async (req, res) => {
  try {
    const recommendedProduct = await product.aggregate([
      {
        $sample: { size: 3 },
      },
      {
        $product: {
          _id: 1,
          name: 1,
          description: 1,
          price: 1,
          image: 1,
        },
      },
    ]);

    res.json({ products: recommendedProduct });
  } catch (error) {
    console.log(`Error getting recommended products: ${error}`);
    res.status(500).json({ message: "Server error" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;

    let cloudinaryResponse = null;

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }

    console.log("Cloudinary URL:", cloudinaryResponse?.url);
    console.log(cloudinaryResponse.type);

    const products = await product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.url ? cloudinaryResponse.url : "",
      category,
    });

    res.status(201).json({ products });
  } catch (error) {
    console.log(`Error creating product: ${error}`);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0]; //this will get the id of the image we will deleted
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log("deleted product by cloudniary");
      } catch (error) {
        console.log("Error deleting product by cloudniary", error.message);
        throw error;
      }
    }

    await product.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log(`Error deleting product: ${error}`);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
    try {
        const products = await product.findById(req.params.id);
        if(products){
            products.isFeatuured = !products.isFeatuured;
            const updatedProduct = await products.save();
            await updatefeaturedProductsCache();
            res.json(updatedProduct);
        }
    } catch (error) {
        console.log(`Error toggling featured product: ${error}`);
        res.status(500).json({ message: "Server error" });
    }
}

async function updatefeaturedProductsCache() {
    try {
        // lean() is used to convert the mongoose object to a plain javascript object
        const featuredProducts = await product.find({ isFeatuured: true }).lean();
        await reddish.set("featured_products", json.stringyfy(featuredProducts));
    } catch (error) {
        console.log(`Error updating featured products cache: ${error}`);
        // res.status(500).json({ message: "Server error" });
    }
}