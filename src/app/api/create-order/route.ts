
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', receipt } = await req.json();

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least ₹1 (100 paise)' },
        { status: 400 }
      );
    }

    const options = {
      amount: Math.round(amount), // amount in paise
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
