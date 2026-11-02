import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@/components/common/FormField'
import type { OnboardingValues } from '../schemas/onboarding.schemas'
import { FIELD_MAX_LENGTH } from '../schemas/onboarding.schemas'
import { COUNTRY_OPTIONS, DEGREE_OPTIONS, FIELD_SUGGESTIONS } from '../schemas/options'
import { ChipGroup } from './ChipGroup'
import { Combobox } from './Combobox'
import { OptionalMark } from './OptionalMark'

export function StepPlan() {
  const { control, register, formState } = useFormContext<OnboardingValues>()

  return (
    <>
      <Controller
        control={control}
        name="country"
        render={({ field }) => (
          <Combobox
            label={
              <>
                Country you're applying from
                <OptionalMark />
              </>
            }
            options={COUNTRY_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            placeholder="Choose a country"
            searchPlaceholder="Search countries"
          />
        )}
      />
      <Controller
        control={control}
        name="targetDegree"
        render={({ field }) => (
          <ChipGroup
            label="Target degree"
            required
            options={DEGREE_OPTIONS}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <FormField
        id="fieldOfStudy"
        label="Field of study (optional)"
        list="field-suggestions"
        required={false}
        autoComplete="off"
        maxLength={FIELD_MAX_LENGTH}
        placeholder="Start typing or pick a suggestion"
        error={formState.errors.fieldOfStudy?.message}
        {...register('fieldOfStudy')}
      />
      <datalist id="field-suggestions">
        {FIELD_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </>
  )
}
