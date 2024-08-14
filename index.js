const path = require("path");
const express = require("express");
const mongoose = require("mongoose");

const session = require("express-session");
const flash = require("connect-flash");

const { isLoggedIn, storeReturnTo } = require("./middleware.js");
const { data } = require("./static/search.js");

const User = require("./models/user");
const Medicine = require("./models/medicine");
const Order = require("./models/order");

const passport = require("passport");
const LocalStrategy = require("passport-local");

// const dbURL = "mongodb+srv://ravvviii:<Ravi@001>@e-janausadhi.sycefov.mongodb.net/";
const dbURL = "mongodb://127.0.0.1:27017/medico";
mongoose
    .connect(dbURL)
    .then(() => console.log("DATABASE CONNECTED."))
    .catch((err) => console.log("DATABASE ERROR !!!"));

const app = express();
app.use(express.static(path.join(__dirname, "static")));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

const sessionConfig = {
    secret: "thisshouldbeabettersecret!",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
};

app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

function storeCart(req, res, next) {
    res.locals.cart = req.session.cart;
    next();
}

app.get("/", (req, res) => {
    // res.render("user");
    res.render("index", {
        results: req.session.results,
        cart: req.session.cart,
    });
});

// app.get("/about", (req, res) => {
//     res.render("about");
// });

app.get("/signin", (req, res) => {
    res.render("signin");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/about.ejs", (req, res) => {
    res.render("about.ejs");
});

app.get("/profile", isLoggedIn, async (req, res) => {
    const orders = await Order.find({ user: req.user._id });
    console.log("orders = ", orders);

    res.render("user", { cart: req.session.cart, orders });
});

app.post("/signup", async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);

        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", "Welcome to medicine");
            res.redirect("/");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
});

app.post(
    "/signin",
    storeReturnTo,
    storeCart,
    passport.authenticate("local", {
        failureFlash: true,
        failureRedirect: "/signin",
    }),
    (req, res, next) => {
        req.flash("success", "Welcome back !!!");
        const redirectUrl = res.locals.returnTo || "/";
        req.session.returnTo = null;
        req.session.cart = res.locals.cart;
        delete res.locals.cart;
        res.redirect(redirectUrl);
    }
);

app.get("/logout", (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash("success", "Goodbye!");
        res.redirect("/");
    });
});

app.get("/search", (req, res) => {
    const search = req.query.search.toLowerCase();
    if (!search) return res.redirect("/");

    let results = [];
    for (let d of data) {
        if (d.name.toLowerCase().includes(search)) {
            results.push(d);
        }
    }

    req.session.results = { search: req.query.search, medicines: results };

    res.redirect("/");
});

app.get("/cart", (req, res) => {
    res.render("cart", { cart: req.session.cart });
});

app.post("/cart/:id", (req, res) => {
    const medicine_id = req.params.id;
    let result = req.session.results.medicines.find((m) => m.sr == medicine_id);

    if (!req.session.cart) {
        req.session.cart = {};
    }

    if (!req.session.cart.hasOwnProperty(medicine_id)) {
        req.session.cart[medicine_id] = result;
        req.session.cart[medicine_id].quantity = 0;
    }

    if (!req.session.cart.total) {
        req.session.cart["total"] = 0;
    }

    req.session.cart[medicine_id].quantity += 1;

    req.session.cart["total"] += parseFloat(
        req.session.cart[medicine_id].price
    );

    res.redirect("/");
});

app.get("/user/:orderid", isLoggedIn, async (req, res) => {
    const { orderid } = req.params;

    const orderData = await Order.findOne({ _id: orderid })
        .populate("items")
        .populate("user");

    req.session.cart = null;
    req.session.results = null;
    res.render("orderPage", { cart: req.session.cart, orderData });
});

app.get("/purchase", isLoggedIn, async (req, res) => {
    const cartData = req.session.cart;
    const newOrder = new Order();
    try {
        for (let key in cartData) {
            if (key === "total") newOrder.total = cartData[key];
            else {
                let { name, price, quantity, sr } = cartData[key];
                price = parseFloat(price);
                const med = new Medicine({
                    name,
                    price,
                    quantity,
                    medicine_id: sr,
                });
                newOrder.items.push(med);
                await med.save();
            }
        }
    } catch (e) {
        console.log(e);
    }
    newOrder.user = req.user._id;
    await newOrder.save();

    req.flash("success", "Order placed.");
    res.redirect("/user/" + newOrder.id);
});

app.get("/clear-cart", (req, res) => {
    req.session.cart = null;
    res.redirect("/");
});

app.get("/forget", (req, res) => {
    res.render("forget");
});

app.listen(3000, () => console.log("Listening on 3000..."));
