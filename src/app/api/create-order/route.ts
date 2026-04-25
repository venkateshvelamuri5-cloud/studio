
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    // Priority for environment variables to allow switching between Test and Prod
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_live_SeqhV0hEn1PXnz';
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error('Razorpay keys not fully configured in env');
      return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const { amount, currency = 'INR', receipt } = await req.json();

    // Razorpay amount must be at least 100 paisa (₹1)
    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least ₹1 (100 paise)' },
        { status: 400 }
      );
    }

    const options = {
      amount: Math.round(amount),
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Razorpay Order Creation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
