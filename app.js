require("dotenv").config();
require("./config/database").connect();

const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const https = require("https");

// importing user context
const User = require("./model/user");
// const auth = require("./middleware/auth");
var loginStatus = 0;

const app = express();

app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get("/", (req, res) => {
  loginStatus = 0;
  res.sendFile(__dirname + "/html/signup.html");
});

// Signup
app.post("/signup", async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { first_name, interest, email, password } = req.body;
    console.log(interest);

    // Validate user input
    if (!(email && password && first_name && interest)) {
      res.status(400).send("All input is required");
    }

    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).sendFile(__dirname + "/html/user-exist.html");
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10);
    // console.log(encryptedPassword);

    // Create user in our database
    const user = await User.create({
      first_name,
      interest,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
    });

    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );
    // save user token
    user.token = token;

    // return new user
    // res.status(201).json(user);
    res.status(200).sendFile(__dirname + "/html/success.html");
  } catch (err) {
    console.log(err);
    res.status(400).sendFile("/html/failure.html");
  }
});

// Login

app.get("/login", function (req, res) {
  res.sendFile(__dirname + "/html/login.html");
});

app.post("/login", async (req, res) => {
  // Our login logic starts here
  try {
    // Get user input
    const { email, password } = req.body;

    // Validate user input
    if (!(email && password)) {
      res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );
      loginStatus = 1;

      // save user token
      user.token = token;
      console.log(user.token);
      console.log(user.interest);
      if (user.interest === 1) {
        res.redirect("/jokes");
      }
      if (user.interest === 2) {
        res.redirect("/pictures");
      }
      if (user.interest === 3) {
        res.redirect("/quotes");
      }
      //res.status(200).json(user);
      // res.send("Success");
    } else {
      res.status(400).sendFile(__dirname + "/html/login-failure.html");
    }
  } catch (err) {
    console.log(err);
  }
});

// 1. jokes

app.get("/jokes", function (req, res) {
  // res.send("Jokes");

  if (loginStatus === 1) {
    const url =
      "https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw&type=twopart";
    https.get(url, function (response) {
      console.log(response.statusCode);
      response.on("data", function (data) {
        const jokeData = JSON.parse(data);
        //   res.send(jokeData);
        console.log(jokeData);
        const jokeQ = jokeData.setup;
        const jokeA = jokeData.delivery;
        //   console.log(jokeQ);

        res.set("Content-Type", "text/html");
        res.write(`<h3> Q: ${jokeQ} </h3> </br>`);
        res.write("<h3>A:" + jokeA + "</h3>");
        res.write(
          '<form action="/jokes" method="get"><button class="btn btn-dark btn-lg" type="submit">One More</button></form>'
        );
        res.send();
      });
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/pictures", function (req, res) {
  // res.send("pictures");
  if (loginStatus === 1) {
    const imgurl = "https://random.imagecdn.app/500/500";
    res.set("Content-Type", "text/html");
    res.write("<img src=" + imgurl + "> </br></br>");
    res.write(
      '<form action="/pictures" method="get"><button class="btn btn-dark btn-lg" type="submit">One More</button></form>'
    );
    res.send();
  } else {
    res.redirect("/login");
  }
});

// 3. quotes
app.get("/quotes", function (req, res) {
  // res.send("quotes");
  if (loginStatus === 1) {
    const url = "https://api.kanye.rest/";
    https.get(url, function (response) {
      console.log(response.statusCode);
      response.on("data", function (data) {
        const quoteData = JSON.parse(data);
        //   res.send(quoteData.quote);
        console.log(quoteData);

        res.set("Content-Type", "text/html");
        res.write(`<h3> ${quoteData.quote} </h3> </br>`);
        res.write(
          '<form action="/quotes" method="get"><button class="btn btn-dark btn-lg" type="submit">One More</button></form>'
        );
        res.send();
      });
    });
  } else {
    res.redirect("/login");
  }
});

// success and failure route
app.post("/success", function (req, res) {
  // take back to login page or login route
  res.redirect("/login");
});

app.post("/failure", function (req, res) {
  // take back to home page or home route
  res.redirect("/");
});

module.exports = app;
