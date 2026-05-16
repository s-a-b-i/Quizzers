import { redirect } from 'next/navigation';

/** Students do not configure exams; dynamic exams are platform-generated. */
export default function DynamicExamRedirectPage() {
  redirect('/exams');
}
