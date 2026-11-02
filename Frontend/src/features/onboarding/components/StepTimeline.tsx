import { Controller, useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import type { OnboardingValues } from '../schemas/onboarding.schemas'
import {
  EMBASSY_OPTIONS,
  getIntakeYears,
  SEASON_OPTIONS,
  STAGE_OPTIONS,
} from '../schemas/options'
import { ChipGroup } from './ChipGroup'
import { Combobox } from './Combobox'
import { HelpTip } from './HelpTip'
import { OptionalMark } from './OptionalMark'

export function StepTimeline() {
  const { control, register } = useFormContext<OnboardingValues>()

  return (
    <>
      <div className="space-y-3">
        <Controller
          control={control}
          name="season"
          render={({ field }) => (
            <ChipGroup
              label="Intake"
              required
              options={SEASON_OPTIONS}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <p className="text-sm text-muted-foreground">WS starts in October, SS starts in April</p>
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <select
            id="year"
            required
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:text-sm dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
            {...register('year')}
          >
            <option value="">Choose a year</option>
            {getIntakeYears().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Controller
        control={control}
        name="stage"
        render={({ field }) => (
          <ChipGroup
            label={
              <>
                Current stage
                <OptionalMark />
              </>
            }
            options={STAGE_OPTIONS}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="embassy"
        render={({ field }) => (
          <Combobox
            label={
              <>
                Embassy or consulate
                <OptionalMark />
              </>
            }
            labelAction={
              <HelpTip label="What is an embassy or consulate?">
                The German embassy where you apply for your visa
              </HelpTip>
            }
            options={EMBASSY_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            placeholder="Choose an embassy"
            searchPlaceholder="Search embassies"
          />
        )}
      />
    </>
  )
}
