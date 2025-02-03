import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { messageId, endpointId, email, name, subject, message } = data;

    // Create tracking pixel and click tracking URLs
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.API_URL 
      : 'http://localhost:3000';

    const trackingPixel = `<img src="${baseUrl}/api/track/open/${messageId}/${endpointId}" width="1" height="1" style="display:none;" />`;
    
    // Convert links in message to trackable links
    const processedMessage = message.replace(
      /(https?:\/\/[^\s]+)/g, 
      (url: string) => `<a href="${baseUrl}/api/track/click/${messageId}/${endpointId}?url=${encodeURIComponent(url)}">${url}</a>`
    );

    // Send email using nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <html>
          <body>
            <h2>Hello ${name},</h2>
            <div>${processedMessage}</div>
            ${trackingPixel}
          </body>
        </html>
      `,
      headers: {
        'X-Message-ID': messageId,
        'X-Endpoint-ID': endpointId
      }
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true,
      messageId,
      endpointId
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
