import type { OrganizerTemplate, OrganizerField } from '@/data/organizerTemplates'
import type { ScaffoldLevel } from '@/types'

/**
 * Editable graphic-organizer field form. Shared by the standalone writing
 * modal and the teacher's sample-authoring view. Mirrors the field styling
 * used inside the book reader's OrganizerModal.
 */
export function OrganizerFieldsForm({
  template,
  scaffoldLevel,
  fields,
  onChange,
}: {
  template: OrganizerTemplate
  scaffoldLevel: ScaffoldLevel
  fields: Record<string, string>
  onChange: (id: string, value: string) => void
}) {
  const guided = scaffoldLevel === 'guided'
  return (
    <div className="space-y-5">
      {template.fields.map((field: OrganizerField) => (
        <div key={field.id} className={`rounded-2xl border p-4 ${guided ? 'border-[#C7D8F0] bg-blue-50/40' : 'border-[#E5E7EB] bg-white'}`}>
          <label className={`block text-base font-bold mb-2 ${guided ? 'text-[#1A1D23]' : 'text-[#4B5563]'}`}>
            {guided && <span className="mr-1.5">{field.icon}</span>}
            {field.label}
          </label>
          {guided && (
            <div className="mb-3 space-y-2">
              <div className="bg-white/80 border border-[#DCEAFE] rounded-xl px-3 py-2">
                <p className="text-xs font-bold text-[#4A90D9] uppercase tracking-wide mb-1">Try this sentence starter</p>
                <p className="text-sm text-[#1A1D23] italic">{field.guidedHint}</p>
              </div>
              {!!field.guidedSteps?.length && (
                <ol className="space-y-1 text-sm text-[#4B5563] list-decimal list-inside">
                  {field.guidedSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
          <textarea
            rows={field.rows}
            maxLength={500}
            value={fields[field.id] ?? ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={guided ? field.guidedHint : field.placeholder}
            className={`w-full border rounded-xl px-3 py-3 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-y min-h-[112px] transition-colors ${
              guided ? 'border-[#C7D8F0] bg-white' : 'border-[#D1D5DB] bg-white'
            }`}
          />
          <p className="text-right text-xs text-[#9CA3AF] mt-1">{(fields[field.id] ?? '').length}/500</p>
        </div>
      ))}
    </div>
  )
}

/** Read-only rendering of a completed organizer — used to show the teacher's sample. */
export function OrganizerSampleView({
  template,
  fields,
}: {
  template: OrganizerTemplate
  fields: Record<string, string>
}) {
  return (
    <div className="space-y-4">
      {template.fields.map((field: OrganizerField) => {
        const value = fields[field.id]?.trim()
        return (
          <div key={field.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F8F9FC] p-4">
            <p className="text-sm font-bold text-[#1A1D23] mb-1.5">
              <span className="mr-1.5">{field.icon}</span>{field.label}
            </p>
            {value ? (
              <p className="text-base text-[#1A1D23] leading-relaxed whitespace-pre-wrap">{value}</p>
            ) : (
              <p className="text-sm text-[#9CA3AF] italic">No sample text for this section.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
