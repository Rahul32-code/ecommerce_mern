import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true,
    },
    description: {
        type:String,
        required:true,
    },
    price:{
        type: Number,
        min: 0,
        required: true,
    },
    image: {
        type: String,
        required: [true, "Image is required"],
    },
    category: {
        type: String,
        required: true,
    },
    isFeatuured :{
        type: Boolean,
        default: false
    }
},{timestamps:true});

const product = mongoose.model("Product", productSchema); // product is a collection name in mongo

export default product;