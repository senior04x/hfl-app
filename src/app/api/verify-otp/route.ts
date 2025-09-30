import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST /api/verify-otp - Verify OTP code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json({ 
        error: 'Phone number and code are required' 
      }, { status: 400, headers: corsHeaders });
    }

    console.log('Verifying OTP for phone:', phone);

    // Call Firebase Cloud Function
    const functionsUrl = process.env.FIREBASE_FUNCTIONS_URL || 'https://us-central1-your-project.cloudfunctions.net';
    const response = await fetch(`${functionsUrl}/verifyOTP`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, code }),
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
    console.error('Error in verify-otp:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500, headers: corsHeaders });
  }
}
