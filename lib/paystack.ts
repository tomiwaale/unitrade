export interface PaystackBank {
  name: string;
  code: string;
}

export async function fetchBanks(): Promise<PaystackBank[]> {
  const response = await fetch(
    "https://api.paystack.co/bank?currency=NGN&perPage=100&use_cursor=false",
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, next: { revalidate: 86400 } }
  );

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Failed to fetch banks");
  }

  const seen = new Set<string>();
  return (body.data as PaystackBank[]).reduce<PaystackBank[]>((acc, { name, code }) => {
    if (!seen.has(code)) { seen.add(code); acc.push({ name, code }); }
    return acc;
  }, []);
}

export interface PaystackTransactionInitialize {
  email: string;
  amount: number; // in kobo (NGN * 100)
  reference?: string;
  callback_url?: string;
  subaccount?: string; // seller's subaccount_code for split payments
  bearer?: "account" | "subaccount"; // who bears Paystack fees
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

// Register a seller's bank account as a Paystack subaccount for split payments.
// percentage_charge is the seller's cut (e.g. 90 = seller keeps 90%).
// settlement_schedule "manual" means funds sit in the subaccount until we trigger settlement.
export async function createSubaccount(
  businessName: string,
  accountNumber: string,
  bankCode: string,
  percentageCharge = 90
): Promise<string> {
  const response = await fetch("https://api.paystack.co/subaccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: percentageCharge,
      settlement_schedule: "manual",
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Failed to create subaccount");
  }

  return body.data.subaccount_code as string;
}

// Trigger immediate settlement for a seller's subaccount after buyer confirms receipt.
export async function settleSubaccount(subaccountCode: string) {
  const response = await fetch("https://api.paystack.co/subaccount/settle", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subaccount: subaccountCode }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "Failed to trigger seller settlement");
  }

  return body.data;
}
