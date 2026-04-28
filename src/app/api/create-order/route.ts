
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    // Priority: Environment Variable > Hardcoded Live Key
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_live_Si1THYFbgZTQOp';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'SaGFSITwIAgJcX'; // Using the provided merchant/secret candidate

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Razorpay Credentials missing' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const body = await req.json();
    const { amount, currency = 'INR', receipt } = body;

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
    let errorMessage = 'Failed to create payment order.';
    
    if (error.statusCode === 401) {
      errorMessage = 'Authorization Failed: The Razorpay Key Secret is likely incorrect. Please ensure the Secret Key in your Dashboard matches what is provided.';
    } else if (error.error?.description) {
      errorMessage = error.error.description;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: error.statusCode || 500 }
    );
  }
}
