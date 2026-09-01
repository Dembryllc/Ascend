import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'

export interface ChecklistStep {
  done: boolean
  label: string
  /** Shown under the label while the step is outstanding. */
  hint?: string
  /** Renders a "Go →" link while the step is outstanding. */
  to?: string
  /** Custom body for an outstanding step (e.g. an inline form). Replaces the hint. */
  children?: ReactNode
}

interface Props {
  title: string
  subtitle: string
  /** Names the region for screen readers. */
  ariaLabel: string
  /** Steps are numbered in the order given, so a caller can omit one that doesn't apply. */
  steps: ChecklistStep[]
  /** Bottom margin varies by host page. */
  className?: string
}

/**
 * Shared getting-started checklist for the teacher dashboard and the student/individual
 * home. Renders nothing once every step is done.
 */
export default function OnboardingChecklist({ title, subtitle, ariaLabel, steps, className = 'mb-6' }: Props) {
  if (steps.every((step) => step.done)) return null

  return (
    <div
      className={`bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 ${className}`}
      role="region"
      aria-label={ariaLabel}
    >
      <h3 className="font-bold text-[#1A1D23] mb-0.5">{title}</h3>
      <p className="text-sm text-[#4B5563] mb-4">{subtitle}</p>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0" aria-hidden="true">
              {step.done
                ? <CheckCircle2 size={20} className="text-[#5BB974]" />
                : <Circle size={20} className="text-[#4A90D9]" />}
            </span>
            <div className="flex-1 min-w-0">
              <span className={`block text-sm font-semibold ${step.done ? 'text-[#9CA3AF] line-through' : 'text-[#1A1D23]'}`}>
                {i + 1}. {step.label}
              </span>
              {!step.done && step.hint && (
                <span className="block text-xs text-[#4B5563] mt-0.5">{step.hint}</span>
              )}
              {!step.done && step.children}
            </div>
            {!step.done && step.to && (
              <Link
                to={step.to}
                className="shrink-0 text-sm font-bold text-[#4A90D9] hover:text-[#357ABD] underline-offset-2 hover:underline"
              >
                Go →
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
