/** Static onboarding choices (taxonomy wiring can replace later). */

export const TARGET_EXAMS = [
  { id: 'sat', label: 'SAT' },
  { id: 'act', label: 'ACT' },
  { id: 'gre', label: 'GRE' },
  { id: 'gmat', label: 'GMAT' },
  { id: 'neet', label: 'NEET' },
  { id: 'jee', label: 'JEE Main / Advanced' },
  { id: 'upsc', label: 'UPSC / Civil Services' },
  { id: 'ca', label: 'CA / Chartered Accountancy' },
  { id: 'bar', label: 'Bar exam' },
  { id: 'nclex', label: 'NCLEX' },
  { id: 'cfe', label: 'CPA / CFE' },
  { id: 'other', label: 'Other / Not listed' },
];

export const EDUCATION_LEVELS = [
  { id: 'high_school', label: 'High school' },
  { id: 'undergraduate', label: 'Undergraduate' },
  { id: 'graduate', label: 'Graduate' },
  { id: 'postgraduate', label: 'Postgraduate' },
  { id: 'working', label: 'Working professional' },
  { id: 'gap_year', label: 'Gap year / break' },
];

export const WEAK_AREA_TAGS = [
  'Algebra',
  'Geometry',
  'Calculus',
  'Reading comprehension',
  'Grammar',
  'Essay writing',
  'Physics',
  'Chemistry',
  'Biology',
  'Data interpretation',
  'Logical reasoning',
  'Time management',
  'Exam anxiety',
  'Speed / accuracy',
];

export const STUDY_MODES = [
  {
    id: 'self-study',
    title: 'Self-study',
    description: 'Practice and review on your own pace with structured materials.',
  },
  {
    id: 'ai-guided',
    title: 'AI-guided',
    description: 'Adaptive hints and explanations powered by MENTIS-style coaching.',
  },
  {
    id: 'mentor-supported',
    title: 'Mentor-supported',
    description: 'Combine independent work with sessions from a mentor.',
  },
];

export const TIMELINE_OPTIONS = [
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 year' },
];
