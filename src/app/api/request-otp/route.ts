import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST /api/request-otp - Request OTP for phone number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ 
        error: 'Phone number is required' 
      }, { status: 400, headers: corsHeaders });
    }

    console.log('Requesting OTP for phone:', phone);

    // Call Firebase Cloud Function
    const functionsUrl = process.env.FIREBASE_FUNCTIONS_URL || 'https://us-central1-your-project.cloudfunctions.net';
    const response = await fetch(`${functionsUrl}/requestOTP`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data, { headers: corsHeaders });
    } else {
      return NextResponse.json(data, { 
        status: response.status, 
        headers: corsHeaders 
      });
    }

  } catch (error) {
    console.error('Error in request-otp:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500, headers: corsHeaders });
  }
}
