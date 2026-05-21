export const SUPPORTED_BANKS = [
  { name: "Access Bank",                    code: "044"    },
  { name: "Ecobank Nigeria",                code: "050"    },
  { name: "Fidelity Bank",                  code: "070"    },
  { name: "First Bank of Nigeria",          code: "011"    },
  { name: "First City Monument Bank (FCMB)", code: "214"   },
  { name: "Guaranty Trust Bank (GTBank)",   code: "058"    },
  { name: "Jaiz Bank",                      code: "301"    },
  { name: "Keystone Bank",                  code: "082"    },
  { name: "Kuda Bank",                      code: "090267" },
  { name: "Moniepoint MFB",                 code: "50515"  },
  { name: "Opay Digital Services",          code: "999992" },
  { name: "PalmPay",                        code: "999991" },
  { name: "Polaris Bank",                   code: "076"    },
  { name: "Stanbic IBTC Bank",              code: "221"    },
  { name: "Sterling Bank",                  code: "232"    },
  { name: "Union Bank",                     code: "032"    },
  { name: "United Bank for Africa (UBA)",   code: "033"    },
  { name: "Wema Bank",                      code: "035"    },
  { name: "Zenith Bank",                    code: "057"    },
] as const;

export const BANK_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  SUPPORTED_BANKS.map((b) => [b.code, b.name])
);
