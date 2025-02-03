import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { PinpointClient, UpdateEndpointCommand, GetEndpointCommand } from "@aws-sdk/client-pinpoint";
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
    const { name, email, subject, message } = await req.json();
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

    // First, get current endpoint data if it exists
    const pinpoint = new PinpointClient({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    let currentMetrics = { emailsSent: 0, opens: 0, clicks: 0 };
    try {
      const currentEndpoint = await pinpoint.send(new GetEndpointCommand({
        ApplicationId: process.env.PINPOINT_PROJECT_ID,
        EndpointId: endpointId
      }));
      currentMetrics = {
        emailsSent: currentEndpoint.EndpointResponse?.Metrics?.emailsSent || 0,
        opens: currentEndpoint.EndpointResponse?.Metrics?.opens || 0,
        clicks: currentEndpoint.EndpointResponse?.Metrics?.clicks || 0
      };
    } catch (error) {
      console.log('No existing endpoint found, creating new one');
    }

    // Update Pinpoint endpoint
    await pinpoint.send(new UpdateEndpointCommand({
      ApplicationId: process.env.PINPOINT_PROJECT_ID,
      EndpointId: endpointId,
      EndpointRequest: {
        ChannelType: 'EMAIL',
        Address: email,
        Attributes: {
          name: [name],
          lastEmailDate: [new Date().toISOString()],
          messageIds: [messageId]
        },
        Metrics: {
          emailsSent: (currentMetrics.emailsSent || 0) + 1,
          opens: currentMetrics.opens || 0,
          clicks: currentMetrics.clicks || 0
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
      error: 'Failed to send email' 
    }, { status: 500 });
  }
}
