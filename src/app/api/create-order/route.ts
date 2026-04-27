
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    // Priority: Environment Variable > Hardcoded Value
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_live_Si1THYFbgZTQOp';
    // Note: The Secret is usually different from the Key ID. 
    // If you have a different Secret Key from your dashboard, please add it to your environment variables.
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_live_Si1THYFbgZTQOp';

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Razorpay Credentials missing' }, { status: 500 });
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
    
    // Extract the most descriptive error message possible
    const errorMessage = error.error?.description || error.message || 'Authentication failed with Razorpay. Please check your Secret Key.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
