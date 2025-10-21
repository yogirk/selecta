const normaliseBaseUrl = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
};

export const API_URL = normaliseBaseUrl(process.env.NEXT_PUBLIC_API_URL) || '';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'app';

export const QUICK_ACTIONS = [
  {
    id: '1',
    label: 'Show monthly revenue trends with YoY comparison',
    prompt: 'Show monthly revenue trends with year-over-year comparison'
  },
  {
    id: '2',
    label: 'Which customer segments grew fastest last quarter?',
    prompt: 'Which customer segments grew fastest last quarter?'
  },
  {
    id: '3',
    label: 'Find products with declining repeat purchases',
    prompt: 'Find products with declining repeat purchases'
  },
  {
    id: '4',
    label: 'Forecast net sales for the next 90 days',
    prompt: 'Forecast net sales for the next 90 days'
  }
];
