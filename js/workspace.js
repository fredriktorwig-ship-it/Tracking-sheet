export function getActiveWorkspace() {
  return localStorage.getItem('activeWorkspace');
}

export function setActiveWorkspace(id) {
  localStorage.setItem('activeWorkspace', id);
}

// Currency helpers
export const CURRENCIES = [
  { code: 'GBP', symbol: '£',  label: 'British Pound (£)' },
  { code: 'USD', symbol: '$',  label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€',  label: 'Euro (€)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'SEK', symbol: 'kr', label: 'Swedish Krona (kr)' },
  { code: 'NOK', symbol: 'kr', label: 'Norwegian Krone (kr)' },
];

export function getCurrencyCode() {
  return localStorage.getItem('wsCurrency') || 'GBP';
}

export function setCurrencyCode(code) {
  localStorage.setItem('wsCurrency', code);
}

export function getCurrencySymbol() {
  const code = getCurrencyCode();
  return CURRENCIES.find(c => c.code === code)?.symbol || '£';
}

export function formatMoney(value, fractionDigits = 2) {
  const n = Number(value) || 0;
  return getCurrencySymbol() + n.toLocaleString('en-GB', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
