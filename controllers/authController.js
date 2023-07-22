const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validator = require("validator");
const zxcvbn = require("zxcvbn");

async function register(req, res) {
  const { email, first_name, last_name, password, password_confirm } = req.body;

  // Input validation
  if (!email || !password || !first_name || !last_name) {
    //return the error message with specific missing field
    return res.status(400).send("Missing required fields");
  }

  if (!validator.isEmail(email)) {
    return res.status(422).json({ message: "Invalid email address" });
  }

  if (zxcvbn(password).score < 1) {
    // should be 3
    return res.status(422).json({ message: "Password not strong enough" });
  }

  //Password confirmation check
  if (password !== password_confirm) {
    return res.status(422).json({ message: "Passwords do not match" });
  }

  // Check if user already exists
  const userExists = await User.exists({ email }).exec();

  if (userExists) {
    return res.status(409).json({ message: "User already exists" });
  }

  // Hash password and create user
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await User.create({
      email,
      password: hashedPassword,
      first_name,
      last_name,
    });

    const accessToken = jwt.sign(
      {
        id: createdUser.id,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "1800s",
      }
    );

    const refreshToken = jwt.sign(
      {
        id: createdUser.id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "1d",
      }
    );

    createdUser.refresh_token = refreshToken;
    await createdUser.save();

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.status(201).json({
      message: "User created successfully",
      access_token: accessToken,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        first_name: createdUser.first_name,
        last_name: createdUser.last_name,
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      return res
        .status(409)
        .json({ message: "Email address already registered" });
    }
    return res.status(400).json({ message: "Could not register" });
  }
}
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(422).json({ message: "Invalid fields" });

  const user = await User.findOne({ email }).exec();

  if (!user)
    return res
      .status(404)
      .json({ message: "User not found please register first" });

  const match = await bcrypt.compare(password, user.password);

  if (!match)
    return res.status(401).json({ message: "Email or password is incorrect" });

  const accessToken = jwt.sign(
    {
      id: user.id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1800s",
    }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "1d",
    }
  );

  user.refresh_token = refreshToken;
  await user.save();

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "None",
    secure: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({
    access_token: accessToken,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    },
  });
}

async function logout(req, res) {
  const cookies = req.cookies;

  if (!cookies.refresh_token) return res.sendStatus(204);

  const refreshToken = cookies.refresh_token;
  const user = await User.findOne({ refresh_token: refreshToken }).exec();

  if (!user) {
    res.clearCookie("refresh_token", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
    return res.sendStatus(204);
  }

  user.refresh_token = null;
  await user.save();

  res.clearCookie("refresh_token", {
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });
  return res.sendStatus(204);
}

async function refresh(req, res) {
  const cookies = req.cookies;
  if (!cookies.refresh_token) return res.sendStatus(401);

  const refreshToken = cookies.refresh_token;

  const user = await User.findOne({ refresh_token: refreshToken }).exec();

  if (!user) return res.sendStatus(403);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) return res.sendStatus(403);

    const accessToken = jwt.sign(
      { id: decoded.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1800s" }
    );

    res.json({
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  });
}

async function user(req, res) {
  const user = req.user;

  return res.status(200).json(user);
}

module.exports = { register, login, logout, refresh, user };
