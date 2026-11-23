import dotenv from "dotenv";
dotenv.config();

import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/email.service.js";


export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ messsag: "name, email and password are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists!" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    return res.status(201).json({
      message: "User registered successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const matchedPassword = await bcrypt.compare(password, user.password);
    if (!matchedPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    return res.status(200).json({
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if(!currentPassword || !newPassword) {
       return res.status(400).json({
        message: "Current password and new password are required",
       });
    }
    if(newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user);

    if(!user) {
      return res.status(404).json({ message: "User not found"});
    }
    const matches = await bcrypt.compare(currentPassword, user.password);
    if(!matches) {
      return res.status(400).json({ message: "Current password is incorrect"});
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: "Password changed successfully"});
  } catch (error) {
    return res.status(500).json({ message: "Could not change password"});
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if(!email) {
      return res.status(400).json({message: "Email is required"});
    }

    const user = await User.findOne({ email });
    const response = {
      message: "If an account exists for that email, a reset link has been sent.",
    }

    if(!user) {
      return res.json(response);
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail({ email: user.email, resetToken });
    return res.json(response);
  } catch(error) {
    console.error("Forgot password failed:", error.message);
    return res.status(500).json({ message: "Could not send reset email"});
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if(!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters",});
    }
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })

    if(!user) {
      return res.status(400).json({
        message: "The reset link is invalid or expired",
      })
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();
    return res.json({ message: "Password reset sucessfully"});
  } catch(error) {
    return res.status(500).json({ message: "Could not reset password"});
  }
}
