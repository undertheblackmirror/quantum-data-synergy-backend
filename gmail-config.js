const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail SMTP Configuration
const createGmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail address
      pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password (not regular password)
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

module.exports = { createGmailTransporter };