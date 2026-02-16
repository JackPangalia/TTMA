import twilio from "twilio";

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

/**
 * Validate that an incoming request genuinely came from Twilio.
 * Uses HMAC-SHA1 signature verification.
 *
 * @param signature - The X-Twilio-Signature header value
 * @param url       - The full public webhook URL
 * @param params    - The parsed form body (key-value pairs)
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(AUTH_TOKEN, signature, url, params);
}

/**
 * Build a TwiML <Response><Message>...</Message></Response> string.
 */
export function twimlResponse(body: string): string {
  const resp = new twilio.twiml.MessagingResponse();
  resp.message(body);
  return resp.toString();
}
