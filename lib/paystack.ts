export interface PaystackTransactionInitialize {
  email: string;
  amount: number; // in kobo (NGN * 100)
  reference?: string;
  callback_url?: string;
}

export async function initializeTransaction(data: PaystackTransactionInitialize) {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Failed to initialize Paystack transaction");
  }

  return body.data;
}

export async function verifyTransaction(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Failed to verify Paystack transaction");
  }

  return body.data;
}

// Verify a seller's bank account number is real before saving it.
// Returns { account_name, account_number }
export async function resolveAccount(accountNumber: string, bankCode: string) {
  const response = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    }
  );

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Could not verify account number");
  }

  return body.data as { account_name: string; account_number: string };
}

// Register a seller's bank account as a Paystack transfer recipient.
// Call once during registration, store the returned recipient_code on their profile.
export async function createTransferRecipient(
  name: string,
  accountNumber: string,
  bankCode: string
): Promise<string> {
  const response = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Failed to register bank account");
  }

  return body.data.recipient_code as string;
}

// Initiate a full refund for a paid order.
export async function refundTransaction(reference: string) {
  const response = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transaction: reference }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Failed to initiate refund");
  }

  return body.data;
}

// Send seller their 90% cut after buyer confirms receipt.
// amountInKobo should already be 90% of the order amount.
export async function transferToSeller(
  recipientCode: string,
  amountInKobo: number,
  reference: string
) {
  const response = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      recipient: recipientCode,
      amount: amountInKobo,
      reference,
      reason: "KolejSwap order payout",
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Failed to transfer funds to seller");
  }

  return body.data;
}
