'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckoutStep = 1 | 2 | 3 | 4;

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
  steps: { step: CheckoutStep; label: string }[];
  onStepClick: (step: CheckoutStep) => void;
}

// 4-node horizontal stepper — done (green check), current (green number +
// outer ring), upcoming (outlined grey). Clicking a completed node jumps
// back to it; forward navigation only ever happens through each step's own
// validated continue button (see onStepClick in the caller).
export function CheckoutStepper({ currentStep, steps, onStepClick }: CheckoutStepperProps) {
  return (
    <div className="flex items-start border-b border-[#EEF1EE] bg-white px-4 py-3">
      {steps.map(({ step, label }, index) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={step} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(step)}
              disabled={!isCompleted}
              className={cn('flex flex-col items-center gap-1.5', isCompleted ? 'cursor-pointer' : 'cursor-default')}
            >
              <span
                className={cn(
                  'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors',
                  isCompleted || isActive
                    ? 'bg-[#17703F] text-white'
                    : 'border-2 border-[#C9D1CB] bg-white text-[#9AA59C]',
                  isActive && 'ring-4 ring-[#E3F1E8]',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-[12px]',
                  isCompleted ? 'font-semibold text-[#17703F]' : isActive ? 'font-bold text-[#142019]' : 'font-medium text-[#9AA59C]',
                )}
              >
                {label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div className={cn('mx-2 h-0.5 flex-1 rounded-full', isCompleted ? 'bg-[#17703F]' : 'bg-[#DDE3DE]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
