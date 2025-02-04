import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();
const user = process.env.EMAIL;
const pass = process.env.PASS;

const transformer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: user,
    pass: pass,
  },
});

export const send_mail_for_sign_up = async (username, userEmail, password) => {
  try {
    const mailOptions = {
      from: email,
      to: userEmail,
      subject: "Your Account Has Been Created",
      text: `Hello ${username},\n\nYour account has been created with the default password: ${password}. Please change your password at your earliest convenience.\n\nBest regards,\nYour Company`,
    };

    await transformer.sendMail(mailOptions);
    return true; // Email sent successfully
  } catch (error) {
    console.log("Error sending credentials through mail", error);
    return false; // Email failed
  }
};
