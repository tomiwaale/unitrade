// Prembly IdentityPass — NIN basic lookup.
// Docs: https://docs.prembly.com/docs/nin-verification
export interface NINVerificationResult {
  firstName: string;
  lastName: string;
  middleName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
}

export async function verifyNIN(nin: string): Promise<NINVerificationResult> {
  const secretKey = process.env.PREMBLY_SECRET_KEY;
  const publicKey = process.env.PREMBLY_PUBLIC_KEY;

  if (!secretKey || !publicKey) {
    throw new Error("NIN verification service is not configured");
  }

  const response = await fetch("https://api.prembly.com/identitypass/verification/nin", {
    method: "POST",
    headers: {
      "x-api-key": secretKey,
      "app-id": publicKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ number_nin: nin }),
  });

  const body = await response.json();

  if (!response.ok || body.status === false) {
    throw new Error(body.detail || body.message || "NIN could not be verified");
  }

  const data = body.ninData ?? body.data ?? {};

  return {
    firstName: data.firstname ?? data.first_name ?? "",
    lastName: data.surname ?? data.last_name ?? "",
    middleName: data.middlename ?? data.middle_name,
    dob: data.birthdate ?? data.dob,
    gender: data.gender,
    phone: data.phone,
  };
}
