
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    // Priority: Environment Variable > Provided Live Key
    // NOTE: Using the key provided by the user. If they are identical, Razorpay might return an error.
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_live_Si1THYFbgZTQOp';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_live_Si1THYFbgZTQOp';

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Razorpay Credentials missing on server' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const { amount, currency = 'INR', receipt } = await req.json();

    // Amount is in Paise. Minimum 100 paise (1 Rupee)
    if (!amount || typeof amount !== 'number' || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum ₹1 is required.' },
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
    return NextResponse.json(
      { error: error.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
