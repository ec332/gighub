// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, password, userType } = await req.json();

  // ✅ This is mock data — replace with DB check later
  const user = {
    id: '123',
    email,
    userType,
  };

  // Simulate simple auth logic
  if (email && password) {
    return NextResponse.json(user);
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}