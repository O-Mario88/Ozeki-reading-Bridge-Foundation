
async function testPesapal() {
   const env = process.env.PESAPAL_ENVIRONMENT || 'sandbox';
   const baseUrl = env === 'live' ? 'https://pay.pesapal.com/v3' : 'https://pay.pesapal.com/v3';

   console.log("Using Pesapal Environment:", env);
   console.log("Using Base URL:", baseUrl);

   const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
   const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

   if (!consumerKey || !consumerSecret) {
      console.error("Missing credentials in env var!");
      return;
   }

   console.log("Attempting to get auth token...");
   
   try {
      const response = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
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

      if (!response.ok) {
         console.error("Pesapal Authentication Failed: HTTP STATUS", response.status);
         console.error("Response body:", await response.text());
         return;
      }

      const data = await response.json();
      console.log("Successfully fetched Token!");
      console.log("Token Response Data Object Keys:", Object.keys(data));
      if (data.token) console.log("Token generated successfully via Pesapal Auth Gateway.");
   } catch (error) {
      console.error("Fetch Exception:", error);
   }
}

testPesapal();
