import { NextResponse } from 'next/server';
import { PinpointClient, GetEndpointCommand, UpdateEndpointCommand } from "@aws-sdk/client-pinpoint";
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  try {
    const { messageId, endpointId } = context.params;
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

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

    // Update endpoint with click tracking
    await pinpoint.send(new UpdateEndpointCommand({
      ApplicationId: process.env.PINPOINT_PROJECT_ID,
      EndpointId: endpointId,
      EndpointRequest: {
        ChannelType: 'EMAIL',
        Address: currentEndpoint.EndpointResponse?.Address,
        Attributes: {
          ...currentAttributes,
          lastClickDate: [new Date().toISOString()],
          clickedMessageIds: [...(currentAttributes.clickedMessageIds || []), messageId],
          clickedUrls: [...(currentAttributes.clickedUrls || []), url]
        },
        Metrics: {
          ...currentMetrics,
          clicks: (currentMetrics.clicks || 0) + 1
        }
      }
    }));

    // Redirect to the original URL
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Error tracking click:', error);
    return NextResponse.error();
  }
}
