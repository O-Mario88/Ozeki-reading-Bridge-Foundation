import { NextResponse } from "next/server";

export async function GET() {
    try {
        const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
        const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

        // Ensure keys are populated
        if (!consumerKey || !consumerSecret || consumerKey.includes("paste_your_real_key_here")) {
            return NextResponse.json({ message: "You must save your real Consumer Key and Secret in .env.local first!" }, { status: 400 });
        }

        // 1. Fetch Bearer Token
        const tokenRes = await fetch('https://pay.pesapal.com/v3/api/Auth/RequestToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                consumer_key: consumerKey,
                consumer_secret: consumerSecret
            })
        });

        if (!tokenRes.ok) {
            return NextResponse.json({ message: "Authentication Failed. Ensure keys are correct." }, { status: 401 });
        }

        const tokenData = await tokenRes.json();
        const bearerToken = tokenData.token;
        
        // 2. Register Webhook (IPN)
        const ipnRes = await fetch('https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: 'https://ozekiread.org/api/payments/pesapal/ipn',
                ipn_notification_type: 'POST'
            })
        });

        const ipnData = await ipnRes.json();

        return NextResponse.json({
            success: true,
            message: "REGISTRATION SUCCESSFUL! Copy the ipn_id below and put it inside your .env.local file as PESAPAL_IPN_ID",
            ipn_id: ipnData.ipn_id
        });

    } catch (err: any) {
        return NextResponse.json({ message: "FATAL ERROR", error: err.message }, { status: 500 });
    }
}
