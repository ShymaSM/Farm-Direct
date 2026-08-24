const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Using Gmail as default, can be configured
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Define the email options
    const mailOptions = {
      from: `FarmDirect Team <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message
    };

    // If a test email is configured in env, send a copy there too
    if (process.env.TEST_NOTIFICATION_EMAIL) {
      mailOptions.bcc = process.env.TEST_NOTIFICATION_EMAIL;
    }

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.email}`);
  } catch (error) {
    console.error('Email could not be sent:', error.message);
  }
};

module.exports = sendEmail;
