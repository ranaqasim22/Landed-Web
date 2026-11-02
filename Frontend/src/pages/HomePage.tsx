import { CompleteProfileBanner } from '@/features/onboarding/components/CompleteProfileBanner'
import { PlaceholderPage } from './PlaceholderPage'

export function HomePage() {
  return (
    <>
      <CompleteProfileBanner />
      <PlaceholderPage title="Home" />
    </>
  )
}
