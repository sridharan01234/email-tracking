// app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { 
  PinpointClient, 
  GetEndpointCommand 
} from "@aws-sdk/client-pinpoint";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const endpointId = require('crypto').createHash('md5').update(email).digest('hex');
    
    const pinpoint = new PinpointClient({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Get endpoint data
    const endpointResponse = await pinpoint.send(new GetEndpointCommand({
      ApplicationId: process.env.PINPOINT_PROJECT_ID,
      EndpointId: endpointId
    }));

    const endpoint = endpointResponse.EndpointResponse;

    return NextResponse.json({
      email: endpoint?.Address,
      metrics: endpoint?.Metrics || {},
      attributes: endpoint?.Attributes || {},
      lastUpdated: endpoint?.EffectiveDate
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch analytics' 
    }, { status: 500 });
  }
}
