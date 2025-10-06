export const CURRENCIES = {
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', countries: ['PH'] },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', countries: ['US', 'UM'] },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', countries: ['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'] },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', countries: ['GB'] },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', countries: ['JP'] },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', countries: ['AU'] },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', countries: ['CA'] },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', countries: ['CH', 'LI'] },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', countries: ['CN'] },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', countries: ['IN'] },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', countries: ['SG'] },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', countries: ['MY'] },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', countries: ['TH'] },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', countries: ['ID'] },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', countries: ['VN'] },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', countries: ['KR'] },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', countries: ['HK'] },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', countries: ['NZ'] },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', countries: ['MX'] },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', countries: ['BR'] },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', countries: ['ZA'] },
};

export type CurrencyCode = keyof typeof CURRENCIES;

export const getCurrencyFromCountry = (countryCode: string): CurrencyCode => {
  for (const [currency, data] of Object.entries(CURRENCIES)) {
    if (data.countries.includes(countryCode.toUpperCase())) {
      return currency as CurrencyCode;
    }
  }
  return 'PHP'; // Default to PHP
};

export const detectUserCountry = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || 'PH';
  } catch (error) {
    console.error('Failed to detect country:', error);
    return 'PH'; // Default to Philippines
  }
};

export const formatCurrency = (amount: number, currencyCode: CurrencyCode): string => {
  const currency = CURRENCIES[currencyCode];
  return `${currency.symbol}${amount.toLocaleString()}`;
};
