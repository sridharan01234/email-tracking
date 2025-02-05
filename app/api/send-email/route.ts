import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

function generateMessageId() {
  return crypto.randomBytes(16).toString('hex');
}

export async function POST(req: Request) {
  try {
    const formData = await req.json();
    const { name, email, subject, message } = formData;
    const messageId = generateMessageId();

    // Create SES SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.AWS_SES_SMTP_HOST, // e.g., 'email-smtp.us-west-2.amazonaws.com'
      port: 587, // TLS port
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.AWS_SES_SMTP_USERNAME,
        pass: process.env.AWS_SES_SMTP_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.SENDER_EMAIL, // Verified sender email in SES
      to: email,
      subject: subject,
      html: `
        <html>
          <body>
            <h2>Hello ${name},</h2>
            <div>${message}</div>
          </body>
        </html>
      `,
      headers: {
        'X-Message-ID': messageId
      }
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true,
      messageId
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
