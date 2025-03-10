import { hash, compare } from 'bcryptjs';
import clientPromise from './mongodb';

export interface User {
  email: string;
  password: string;
  userType: 'employer' | 'employee';
}

export async function createUser(userData: User) {
  const client = await clientPromise;
  const db = client.db();

  // Check if user already exists
  const existingUser = await db.collection('users').findOne({ email: userData.email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash the password
  const hashedPassword = await hash(userData.password, 12);

  // Create the user
  const result = await db.collection('users').insertOne({
    ...userData,
    password: hashedPassword,
  });

  return { ...userData, _id: result.insertedId, password: undefined };
}

export async function findUser(email: string) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection('users').findOne({ email });
}

export async function validateUser(email: string, password: string) {
  const user = await findUser(email);
  if (!user) return null;

  const isValid = await compare(password, user.password);
  if (!isValid) return null;

  return { ...user, password: undefined };
} 