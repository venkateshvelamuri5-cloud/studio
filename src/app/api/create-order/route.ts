
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error('Missing Razorpay credentials');
      return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 500 });
    }

    // Initialize inside the request to avoid build-time errors with missing env vars
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

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
