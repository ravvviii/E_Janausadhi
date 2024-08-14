const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MedicineSchema = new Schema({
    medicine_id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
});

MedicineSchema.virtual("totalPrice").get(function () {
    return this.quantity * this.price;
});

MedicineSchema.set("toJSON", { virtuals: true });
MedicineSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Medicine", MedicineSchema);
