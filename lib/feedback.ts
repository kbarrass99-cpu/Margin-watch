// The feedback form's questions, shared by the page and the API route.

export const RECOMMEND_OPTIONS = [
  { id: 'yes', label: 'Yes' },
  { id: 'not_yet', label: 'Not yet' },
  { id: 'no', label: 'No' },
] as const;

export type Recommend = (typeof RECOMMEND_OPTIONS)[number]['id'];

export const FEEDBACK_QUESTIONS = [
  {
    id: 'working',
    question: "What's working well?",
    placeholder: 'For example: the margin alerts, how quick it is to add a product',
  },
  {
    id: 'missing',
    question: "What's missing, confusing or frustrating?",
    placeholder: "Anything that didn't work the way you expected",
  },
  {
    id: 'features',
    question: 'What would you like us to build next?',
    placeholder: 'For example: more supplier sites, Shopify sync, a weekly summary email',
  },
] as const;

export type FeedbackField = (typeof FEEDBACK_QUESTIONS)[number]['id'];

export const FEEDBACK_MAX_LENGTH = 2000;
