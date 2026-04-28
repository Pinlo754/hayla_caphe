import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY || 'sk_c247acfdeec6352c61d85ddbc01388c33486a50ebda2d68a';

  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set in environment variables' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_4001kn2hkxgpee4ac5t92aqyg7xg`,
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch token' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}