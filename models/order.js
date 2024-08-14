const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const addHoursAndMinutes = (date) => {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + 5);
    newDate.setMinutes(newDate.getMinutes() + 30);
    return newDate;
};

const OrderSchema = new Schema({
    placedAt: {
        type: Date,
        default: () => addHoursAndMinutes(Date.now()),
    },
    items: [
        {
            type: Schema.Types.ObjectId,
            ref: "Medicine",
        },
    ],
    total: {
        type: Number,
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
});

OrderSchema.virtual("formattedDate").get(function () {
    const options = { day: "numeric", month: "long", year: "numeric" };
    return new Intl.DateTimeFormat("en-US", options).format(this.placedAt);
});

module.exports = mongoose.model("Order", OrderSchema);
