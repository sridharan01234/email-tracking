import { NextResponse } from 'next/server';
import { 
  PinpointClient, 
  UpdateEndpointCommand,
  CreateCampaignCommand 
} from "@aws-sdk/client-pinpoint";
import crypto from 'crypto';

function generateMessageId() {
  return crypto.randomBytes(16).toString('hex');
}

export async function POST(req: Request) {
  try {
    const formData = await req.json();
    const { name, email, subject, message } = formData;
    const messageId = generateMessageId();
    const endpointId = crypto.createHash('md5').update(email).digest('hex');

    const pinpoint = new PinpointClient({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Update the endpoint
    await pinpoint.send(new UpdateEndpointCommand({
      ApplicationId: process.env.PINPOINT_PROJECT_ID!,
      EndpointId: endpointId,
      EndpointRequest: {
        ChannelType: 'CUSTOM',
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

    // Create a campaign with custom URL
    await pinpoint.send(new CreateCampaignCommand({
      ApplicationId: process.env.PINPOINT_PROJECT_ID!,
      WriteCampaignRequest: {
        Name: `Email_${messageId}`,
        CustomDeliveryConfiguration: {
          DeliveryUri: process.env.CUSTOM_ENDPOINT_URL,
          EndpointTypes: ['CUSTOM']
        },
        MessageConfiguration: {
          CustomMessage: {
            Data: JSON.stringify({
              messageId,
              endpointId,
              email,
              name,
              subject,
              message,
              timestamp: new Date().toISOString()
            })
          }
        },
        Schedule: {
          IsLocalTime: false,
          StartTime: new Date().toISOString()
        }
      }
    }));

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
