
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    // Priority: Environment Variable > Hardcoded Value
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_live_Si1THYFbgZTQOp';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_ID || 'rzp_live_Si1THYFbgZTQOp';

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Razorpay Credentials missing' }, { status: 500 });
    }

    // Razorpay Keys should NOT be identical. 
    // If the user provided the same string for both, the API will fail.
    if (key_id === key_secret && key_id !== '') {
      return NextResponse.json(
        { error: 'Razorpay Key ID and Secret cannot be identical. Please check your Razorpay Dashboard for the Secret Key.' },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const { amount, currency = 'INR', receipt } = await req.json();

    // Amount is in Paise. Minimum 100 paise (1 Rupee)
    if (!amount || typeof amount !== 'number' || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum ₹1 is required for payment.' },
        { status: 400 }
      );
    }

    const options = {
      amount: Math.round(amount), 
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Razorpay Order Creation Error:', error);
    // Return the actual error message from Razorpay for better debugging
    return NextResponse.json(
      { error: error.error?.description || error.message || 'Failed to connect to Razorpay' },
      { status: 500 }
    );
  }
}
