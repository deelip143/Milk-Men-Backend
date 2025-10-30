import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendOtp = async (mobile, otp) => {
  try {
    const toNumber = mobile.startsWith("+") ? mobile : `+91${mobile}`;

    const messageBody = `MilkMen App: Your OTP is ${otp}. It is valid for 5 minutes. Do not share it with anyone.`;
    const message = await client.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber,
    });

    console.log("✅ OTP sent:", message.sid);
    return true;
  } catch (error) {
    console.error("❌ Twilio Error:", error.message);
    return false;
  }
};

