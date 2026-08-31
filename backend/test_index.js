const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
require("dotenv").config();

const schema = new mongoose.Schema({ a: Number, status: String });
schema.index({ a: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["A", "B"] } } });
const TestModel = mongoose.model("TestModel", schema);

const run = async () => {
    await connectDB();
    await TestModel.init();
    console.log("Index built successfully");
    process.exit(0);
};

run().catch(err => {
    console.error("Failed to build index", err.message);
    process.exit(1);
});
