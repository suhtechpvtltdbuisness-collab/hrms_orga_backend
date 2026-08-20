export const LEAD_SCORE_RULES: Record<string, number> = {
  page_view: 1,
  services_view: 3,
  pricing_view: 5,
  enterprise_view: 7,
  contact_view: 10,
  form_start: 5,
  form_submit: 20,
  signup: 15,
  login: 5,
  cta_click: 3,
  returning_visit: 5,
  person_identified: 10,
  company_identified: 5,
};

export function scoreEvent(eventName: string): number {
  return LEAD_SCORE_RULES[eventName] ?? 0;
}
