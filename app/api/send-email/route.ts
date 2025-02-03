import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { PinpointClient, UpdateEndpointCommand } from "@aws-sdk/client-pinpoint";
import crypto from 'crypto';

function generateMessageId() {
  return crypto.randomBytes(16).toString('hex');
}

function getBaseUrl() {
  return process.env.NODE_ENV === 'production' 
    ? process.env.API_URL 
    : 'http://localhost:3000';
}

export async function POST(req: Request) {
  try {
    const formData = await req.json();
    const { name, email, subject, message } = formData;
    const messageId = generateMessageId();
    const endpointId = crypto.createHash('md5').update(email).digest('hex');
    const baseUrl = getBaseUrl();

    // Create tracking pixel and click tracking URLs
    const trackingPixel = `<img src="${baseUrl}/api/track/open/${messageId}/${endpointId}" width="1" height="1" style="display:none;" />`;
    
    // Convert links in message to trackable links
    const processedMessage = message.replace(
      /(https?:\/\/[^\s]+)/g, 
      (url: string) => `<a href="${baseUrl}/api/track/click/${messageId}/${endpointId}?url=${encodeURIComponent(url)}">${url}</a>`
    );

    const pinpoint = new PinpointClient({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Update Pinpoint endpoint
    await pinpoint.send(new UpdateEndpointCommand({
      ApplicationId: process.env.PINPOINT_PROJECT_ID!, // Make sure this is set
      EndpointId: endpointId,
      EndpointRequest: {
        ChannelType: 'EMAIL',
        Address: email,
        Attributes: {
          name: [name],
          lastEmailDate: [new Date().toISOString()],
          messageIds: [messageId]
        },
        User: {
          UserId: email
        }
      }
    }));

    // Send email with tracking
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
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
