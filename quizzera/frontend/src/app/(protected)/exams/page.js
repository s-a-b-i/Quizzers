'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { ExamStartCard } from '@/components/exam/ExamStartCard';
import {
  ExamBrowseCardsSkeleton,
  ExamPageError,
} from '@/components/exam/ExamPageStates';

function ExamSection({ title, label, exams, loading, showRecommendedBadge = false }) {
  if (loading) {
    return (
      <section className="mb-12">
        <h2 className="text-sm font-bold text-[#111111]">{title}</h2>
        {label ? (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B]">
            {label}
          </p>
        ) : null}
        <div className="mt-4">
          <ExamBrowseCardsSkeleton count={3} />
        </div>
      </section>
    );
  }

  if (!exams.length) {
    return (
      <section className="mb-12">
        <h2 className="text-sm font-bold text-[#111111]">{title}</h2>
        {label ? (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B]">
            {label}
          </p>
        ) : null}
        <p className="mt-4 rounded-[12px] border border-[#E5E5E5] bg-white px-4 py-8 text-center text-sm text-[#6B6B6B]">
          No exams available in this section yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-sm font-bold text-[#111111]">{title}</h2>
      {label ? (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B]">
          {label}
        </p>
      ) : null}
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <li key={String(exam._id ?? exam.slug)} className="h-full">
            <ExamStartCard exam={exam} showRecommendedBadge={showRecommendedBadge} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function fetchExamList(params) {
  const { data } = await apiGet('/api/exams', { params });
  if (!data?.success || !Array.isArray(data?.data?.exams)) {
    throw new Error('Invalid response from server.');
  }
  return data.data.exams;
}

export default function ExamsPage() {
  const [recommended, setRecommended] = useState([]);
  const [mockExams, setMockExams] = useState([]);
  const [topicQuizzes, setTopicQuizzes] = useState([]);

  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [loadingMock, setLoadingMock] = useState(true);
  const [loadingTopic, setLoadingTopic] = useState(true);
  const [error, setError] = useState(false);

  const loadAll = useCallback(async () => {
    setError(false);
    setLoadingRecommended(true);
    setLoadingMock(true);
    setLoadingTopic(true);

    const results = await Promise.allSettled([
      fetchExamList({ recommended: true, page: 1, limit: 3 }),
      fetchExamList({ examType: 'mock', page: 1, limit: 100 }),
      fetchExamList({ examType: 'topic-quiz', page: 1, limit: 100 }),
    ]);

    if (results.some((r) => r.status === 'rejected')) {
      setError(true);
    }

    if (results[0].status === 'fulfilled') setRecommended(results[0].value);
    else setRecommended([]);

    if (results[1].status === 'fulfilled') setMockExams(results[1].value);
    else setMockExams([]);

    if (results[2].status === 'fulfilled') setTopicQuizzes(results[2].value);
    else setTopicQuizzes([]);

    setLoadingRecommended(false);
    setLoadingMock(false);
    setLoadingTopic(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const pageLoading = loadingRecommended && loadingMock && loadingTopic;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#111111]">Exams</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Pick an exam to start. Content is prepared for you — just tap Start Exam.
        </p>
      </header>

      {error && !pageLoading ? (
        <ExamPageError onRetry={loadAll} />
      ) : (
        <>
          <ExamSection
            title="Recommended for you"
            label="Recommended"
            exams={recommended}
            loading={loadingRecommended}
            showRecommendedBadge
          />
          <ExamSection title="Mock exams" exams={mockExams} loading={loadingMock} />
          <ExamSection title="Topic quizzes" exams={topicQuizzes} loading={loadingTopic} />
        </>
      )}
    </main>
  );
}
