const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'https://quantumdatasynergy.com',
    'https://www.quantumdatasynergy.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['POST', 'OPTIONS', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting - prevent spam
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many contact form submissions, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Newsletter rate limiting - more restrictive
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 newsletter subscriptions per hour
  message: {
    error: 'Too many newsletter subscription attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Configure Gmail SMTP
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.error('Gmail SMTP connection error:', error);
  } else {
    console.log('✅ Gmail SMTP server is ready to send emails');
  }
});

// Validation function
const validateContactForm = (data) => {
  const { name, email, subject, message } = data;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!subject || subject.trim().length < 5) {
    errors.push('Subject must be at least 5 characters long');
  }

  if (!message || message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }

  return errors;
};

// Newsletter validation
const validateNewsletterEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return 'Please provide a valid email address';
  }
  return null;
};

// Contact form endpoint
app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate input
    const validationErrors = validateContactForm(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Sanitize input
    const sanitizedData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim()
    };

    const timestamp = new Date().toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Panama'
    });

    // Email content for you (the recipient)
    const adminMailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: `🚀 New Contact Form: ${sanitizedData.subject}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px;">
              ⚡
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">New Contact Form</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">quantumdatasynergy.com</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 24px; font-weight: bold; margin-bottom: 20px;">
              📧 Contact Details
            </div>
            
            <div style="background-color: #f1f5f9; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #2563eb;">
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; align-items: center;">
                  <span style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; margin-right: 15px; min-width: 80px; text-align: center;">👤 Name</span>
                  <span style="font-size: 16px; color: #334155; font-weight: 600;">${sanitizedData.name}</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="background: #14b8a6; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; margin-right: 15px; min-width: 80px; text-align: center;">📧 Email</span>
                  <a href="mailto:${sanitizedData.email}" style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 16px;">${sanitizedData.email}</a>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="background: #f59e0b; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; margin-right: 15px; min-width: 80px; text-align: center;">📝 Subject</span>
                  <span style="font-size: 16px; color: #334155; font-weight: 600;">${sanitizedData.subject}</span>
                </div>
              </div>
            </div>
            
            <div style="background-color: #ffffff; padding: 25px; border: 2px solid #e2e8f0; border-radius: 12px; margin: 25px 0;">
              <h3 style="color: #1e293b; margin-top: 0; font-size: 18px; font-weight: 700; display: flex; align-items: center;">
                💬 Message:
              </h3>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
                <p style="line-height: 1.8; color: #475569; margin: 0; font-size: 15px;">${sanitizedData.message.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #14b8a6 0%, #059669 100%); padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px;">🚀 Quick Actions</h3>
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <a href="mailto:${sanitizedData.email}?subject=Re: ${sanitizedData.subject}&body=Hi ${sanitizedData.name},%0D%0A%0D%0AThank you for contacting Quantum Data Synergy.%0D%0A%0D%0A" 
                   style="background: white; color: #059669; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 5px;">
                  ↩️ Reply Now
                </a>
                <a href="tel:+5076897-6654" 
                   style="background: rgba(255,255,255,0.2); color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 5px;">
                  📞 Call Client
                </a>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 8px; margin-top: 30px;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                📅 Received: ${timestamp}<br>
                🌐 From: quantumdatasynergy.com<br>
                📍 Panama City, Panama
              </p>
            </div>
          </div>
        </div>
      `,
      replyTo: sanitizedData.email
    };

    // Auto-reply email for the user
    const userMailOptions = {
      from: process.env.GMAIL_USER,
      to: sanitizedData.email,
      subject: '✅ Thank you for contacting Quantum Data Synergy!',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
            <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px;">
              ⚡
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Quantum Data Synergy</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Technology & Data Consulting</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 24px;">Hello ${sanitizedData.name}! 👋</h2>
              <p style="color: #64748b; font-size: 18px; margin: 0;">Thank you for reaching out to us!</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #0ea5e9;">
              <h3 style="color: #0c4a6e; margin-top: 0; font-size: 18px; display: flex; align-items: center;">
                📋 Your Message Summary
              </h3>
              <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <p style="margin: 8px 0; color: #334155;"><strong>Subject:</strong> ${sanitizedData.subject}</p>
                <p style="margin: 8px 0; color: #64748b; font-size: 14px;"><strong>Submitted:</strong> ${timestamp}</p>
                <p style="margin: 8px 0; color: #64748b; font-size: 14px;"><strong>Reference ID:</strong> #QDS${Date.now().toString().slice(-6)}</p>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #22c55e;">
              <h3 style="color: #15803d; margin-top: 0; font-size: 18px; display: flex; align-items: center;">
                🚀 What happens next?
              </h3>
              <div style="display: grid; gap: 15px; margin-top: 15px;">
                <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px;">
                  <span style="background: #22c55e; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">1</span>
                  <span style="color: #374151; font-weight: 500;">Our team reviews your inquiry</span>
                </div>
                <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px;">
                  <span style="background: #3b82f6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">2</span>
                  <span style="color: #374151; font-weight: 500;">We respond within 24 hours</span>
                </div>
                <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px;">
                  <span style="background: #8b5cf6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">3</span>
                  <span style="color: #374151; font-weight: 500;">Schedule a consultation if needed</span>
                </div>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border-left: 5px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">⚡ Need immediate assistance?</h3>
              <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
                <a href="mailto:contact@quantumdatasynergy.com" 
                   style="background: white; color: #92400e; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  📧 Email Us
                </a>
                <a href="tel:+5076897-6654" 
                   style="background: #92400e; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center;">
                  📞 Call Now
                </a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 16px; margin-bottom: 15px; font-weight: 500;">
                Follow us for the latest in AI & Data Innovation
              </p>
              <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                <a href="https://quantumdatasynergy.com" style="background: #2563eb; color: white; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: bold;">🌐</a>
                <a href="mailto:contact@quantumdatasynergy.com" style="background: #14b8a6; color: white; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: bold;">📧</a>
                <a href="tel:+5076897-6654" style="background: #f59e0b; color: white; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: bold;">📞</a>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; padding: 25px; background-color: #f8fafc; color: #64748b; font-size: 12px; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 5px 0;">© ${new Date().getFullYear()} Quantum Data Synergy. All rights reserved.</p>
            <p style="margin: 0;">📍 Panama City, Panama | 🌐 quantumdatasynergy.com</p>
          </div>
        </div>
      `
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions)
    ]);

    console.log(`✅ Email sent successfully from ${sanitizedData.email} - Subject: ${sanitizedData.subject}`);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you within 24 hours.'
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      error: 'Failed to send message. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Newsletter subscription endpoint
app.post('/api/newsletter', newsletterLimiter, async (req, res) => {
  try {
    const { email, source } = req.body;

    // Validate email
    const emailError = validateNewsletterEmail(email);
    if (emailError) {
      return res.status(400).json({
        error: emailError
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const timestamp = new Date().toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Panama'
    });

    // Email to admin about new newsletter subscription
    const adminNewsletterOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: '📧 New Newsletter Subscription - Quantum Data Synergy',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px;">
              📧
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">New Newsletter Subscription</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">quantumdatasynergy.com</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #14b8a6 0%, #059669 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 24px; font-weight: bold; margin-bottom: 20px;">
              📬 Subscription Details
            </div>
            
            <div style="background-color: #f0fdf4; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #22c55e;">
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; align-items: center;">
                  <span style="background: #22c55e; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; margin-right: 15px; min-width: 80px; text-align: center;">📧 Email</span>
                  <a href="mailto:${sanitizedEmail}" style="color: #059669; text-decoration: none; font-weight: 600; font-size: 16px;">${sanitizedEmail}</a>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="background: #14b8a6; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; margin-right: 15px; min-width: 80px; text-align: center;">📍 Source</span>
                  <span style="font-size: 16px; color: #334155; font-weight: 600;">${source || 'Website'}</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="background: #f59e0b; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; margin-right: 15px; min-width: 80px; text-align: center;">📅 Date</span>
                  <span style="font-size: 16px; color: #334155; font-weight: 600;">${timestamp}</span>
                </div>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #14b8a6 0%, #059669 100%); padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px;">📊 Action Items</h3>
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <a href="mailto:${sanitizedEmail}?subject=Welcome to Quantum Data Synergy Newsletter&body=Hi there,%0D%0A%0D%0AThank you for subscribing to our newsletter!%0D%0A%0D%0A" 
                   style="background: white; color: #059669; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 5px;">
                  📧 Send Welcome Email
                </a>
                <span style="background: rgba(255,255,255,0.2); color: white; padding: 12px 20px; border-radius: 8px; font-weight: bold; display: inline-block; margin: 5px;">
                  📝 Add to Mailing List
                </span>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 8px; margin-top: 30px;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                📅 Subscribed: ${timestamp}<br>
                🌐 From: quantumdatasynergy.com<br>
                📍 Panama City, Panama
              </p>
            </div>
          </div>
        </div>
      `
    };

    // Welcome email for the subscriber
    const welcomeEmailOptions = {
      from: process.env.GMAIL_USER,
      to: sanitizedEmail,
      subject: '🎉 Welcome to Quantum Data Synergy Newsletter!',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
            <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px;">
              ⚡
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Our Newsletter!</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Quantum Data Synergy</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 24px;">Thank you for subscribing! 🎉</h2>
              <p style="color: #64748b; font-size: 18px; margin: 0;">You're now part of our community of AI and data enthusiasts.</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #0ea5e9;">
              <h3 style="color: #0c4a6e; margin-top: 0; font-size: 18px; display: flex; align-items: center;">
                📬 What to expect from our newsletter
              </h3>
              <ul style="color: #334155; line-height: 1.8; padding-left: 20px;">
                <li>Latest AI and data analytics trends in Panama</li>
                <li>Technology insights for Latin American businesses</li>
                <li>Case studies and success stories</li>
                <li>Exclusive tips and best practices</li>
                <li>Industry news and updates</li>
              </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #22c55e;">
              <h3 style="color: #15803d; margin-top: 0; font-size: 18px; display: flex; align-items: center;">
                🚀 Get started with our resources
              </h3>
              <div style="display: grid; gap: 15px; margin-top: 15px;">
                <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px;">
                  <span style="background: #22c55e; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">📊</span>
                  <span style="color: #374151; font-weight: 500;">Explore our data analysis services</span>
                </div>
                <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px;">
                  <span style="background: #3b82f6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">🤖</span>
                  <span style="color: #374151; font-weight: 500;">Learn about AI consulting opportunities</span>
                </div>
                <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px;">
                  <span style="background: #8b5cf6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">💡</span>
                  <span style="color: #374151; font-weight: 500;">Schedule a free consultation</span>
                </div>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border-left: 5px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">🤝 Let's connect!</h3>
              <p style="color: #92400e; margin-bottom: 15px;">Have questions or want to discuss your data needs?</p>
              <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
                <a href="mailto:contact@quantumdatasynergy.com" 
                   style="background: white; color: #92400e; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  📧 Email Us
                </a>
                <a href="tel:+5076897-6654" 
                   style="background: #92400e; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center;">
                  📞 Call Now
                </a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 16px; margin-bottom: 15px; font-weight: 500;">
                Follow us for daily insights
              </p>
              <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                <a href="https://quantumdatasynergy.com" style="background: #2563eb; color: white; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: bold;">🌐</a>
                <a href="mailto:contact@quantumdatasynergy.com" style="background: #14b8a6; color: white; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: bold;">📧</a>
                <a href="tel:+5076897-6654" style="background: #f59e0b; color: white; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: bold;">📞</a>
              </div>
              <p style="color: #9ca3af; font-size: 12px;">
                You can unsubscribe at any time by replying to any newsletter email.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 25px; background-color: #f8fafc; color: #64748b; font-size: 12px; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 5px 0;">© ${new Date().getFullYear()} Quantum Data Synergy. All rights reserved.</p>
            <p style="margin: 0;">📍 Panama City, Panama | 🌐 quantumdatasynergy.com</p>
          </div>
        </div>
      `
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(adminNewsletterOptions),
      transporter.sendMail(welcomeEmailOptions)
    ]);

    console.log(`✅ Newsletter subscription processed for ${sanitizedEmail}`);

    res.status(200).json({
      success: true,
      message: 'Successfully subscribed to newsletter! Check your email for confirmation.'
    });

  } catch (error) {
    console.error('❌ Error processing newsletter subscription:', error);
    res.status(500).json({
      error: 'Failed to subscribe to newsletter. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Gmail SMTP for quantumdatasynergy.com',
    timestamp: new Date().toISOString(),
    domain: 'quantumdatasynergy.com',
    endpoints: {
      contact: '/api/contact',
      newsletter: '/api/newsletter'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Quantum Data Synergy Contact API',
    domain: 'quantumdatasynergy.com',
    endpoints: {
      health: '/api/health',
      contact: '/api/contact',
      newsletter: '/api/newsletter'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Quantum Data Synergy API running on port ${PORT}`);
  console.log(`📧 Using Gmail SMTP for contact@quantumdatasynergy.com`);
  console.log(`🌐 Domain: quantumdatasynergy.com`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📬 Newsletter endpoint: http://localhost:${PORT}/api/newsletter`);
});

module.exports = app;
