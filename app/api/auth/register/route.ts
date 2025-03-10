import { NextResponse } from 'next/server';
import { createUser } from '@/lib/users';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, userType } = body;

    // Validate input
    if (!email || !password || !userType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser({ email, password, userType });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 