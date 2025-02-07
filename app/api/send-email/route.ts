import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const formData = await req.json();
    const { name, email, subject, message } = formData;

    const transporter = nodemailer.createTransport({
      host: process.env.AWS_SES_SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.AWS_SES_SMTP_USERNAME,
        pass: process.env.AWS_SES_SMTP_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
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
    };

    const result = await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
