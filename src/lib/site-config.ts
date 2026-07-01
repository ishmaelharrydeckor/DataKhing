export const SITE_CONFIG = {
  SITE_NAME: "DataKhing",
  SITE_TAGLINE: "Your Premium Mobile Data Bundle Partner in Ghana",
  SUPPORT_EMAIL: "support@datakhing.com",
  SUPPORT_PHONE: "+233 24 000 0000",
  LOGO_PATH: "/logo.png",
  CURRENCY_CODE: "GHS",
  CURRENCY_SYMBOL: "GH₵",
  THEME_COLOR: "#4f46e5", // indigo-600
  MOCK_MODE: process.env.MOCK_MODE !== "false", // defaults to true unless explicitly 'false'
};

// Ghanaian phone formats: MTN (024, 054, 055, 059, 025, 053), Telecel (020, 050), AirtelTigo (026, 056, 027, 057)
export const NETWORK_PREFIXES = {
  MTN: ["024", "054", "055", "059", "025", "053", "24", "54", "55", "59", "25", "53"],
  TELECEL: ["020", "050", "20", "50"],
  AIRTELTIGO: ["026", "056", "027", "057", "26", "56", "27", "57"],
};

export type NetworkType = "MTN" | "TELECEL" | "AIRTELTIGO";

export function getNetworkFromPhone(phone: string): NetworkType | null {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  // Handle country code +233 or 233
  let localNum = cleanPhone;
  if (localNum.startsWith("233")) {
    localNum = "0" + localNum.slice(3);
  } else if (!localNum.startsWith("0")) {
    localNum = "0" + localNum;
  }

  for (const [net, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    for (const prefix of prefixes) {
      if (prefix.startsWith("0") && localNum.startsWith(prefix)) {
        return net as NetworkType;
      }
    }
  }
  return null;
}

export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("233")) {
    return "0" + cleanPhone.slice(3);
  }
  return cleanPhone;
}

export function validatePhoneNumber(phone: string, network: NetworkType): boolean {
  const formatted = formatPhone(phone);
  if (formatted.length !== 10) return false;
  
  const prefixes = NETWORK_PREFIXES[network].filter(p => p.startsWith("0"));
  return prefixes.some(p => formatted.startsWith(p));
}

export function formatPesewas(pesewas: number): string {
  return `${SITE_CONFIG.CURRENCY_SYMBOL}${(pesewas / 100).toFixed(2)}`;
}
