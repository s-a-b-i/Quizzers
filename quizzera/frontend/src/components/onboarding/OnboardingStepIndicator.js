'use client';

export function OnboardingStepIndicator({ currentStep, totalSteps }) {
  return (
    <nav className="flex items-center justify-center gap-3 sm:gap-4" aria-label="Onboarding progress">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const completed = step < currentStep;
        const active = step === currentStep;

        return (
          <div key={step} className="flex flex-col items-center gap-1">
            <span
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                completed || active ? 'bg-primary text-inverse' : 'bg-[#E5E5E5] text-primary',
              ].join(' ')}
              aria-current={active ? 'step' : undefined}
            >
              {completed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                step
              )}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
