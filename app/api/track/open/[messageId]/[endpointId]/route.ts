import { NextResponse } from 'next/server';
import { PinpointClient, GetEndpointCommand, UpdateEndpointCommand } from "@aws-sdk/client-pinpoint";
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string; endpointId: string }> }
) {
  try {
    const { messageId, endpointId } = await params;

    const pinpoint = new PinpointClient({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Get current endpoint data
    const currentEndpoint = await pinpoint.send(new GetEndpointCommand({
      ApplicationId: process.env.PINPOINT_PROJECT_ID,
      EndpointId: endpointId
    }));

    const currentMetrics = currentEndpoint.EndpointResponse?.Metrics || {};
    const currentAttributes = currentEndpoint.EndpointResponse?.Attributes || {};

    // Update endpoint with open tracking
    await pinpoint.send(new UpdateEndpointCommand({
      ApplicationId: process.env.PINPOINT_PROJECT_ID,
      EndpointId: endpointId,
      EndpointRequest: {
        ChannelType: 'EMAIL',
        Address: currentEndpoint.EndpointResponse?.Address,
        Attributes: {
          ...currentAttributes,
          lastOpenDate: [new Date().toISOString()],
          openedMessageIds: [...(currentAttributes.openedMessageIds || []), messageId]
        },
        Metrics: {
          ...currentMetrics,
          opens: (currentMetrics.opens || 0) + 1
        }
      }
    }));

    // Return a transparent 1x1 pixel
    return new NextResponse(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error tracking open:', error);
    return NextResponse.error();
  }
}
