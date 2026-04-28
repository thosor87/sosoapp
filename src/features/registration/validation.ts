import type { Registration } from '@/lib/firebase/types'

type ValidationResult = {
  valid: boolean
  errors: Record<string, string>
}

type Step1Data = Pick<Registration, 'familyName' | 'contactName' | 'adultsCount'> & { email: string }

export function validateStep1(data: Step1Data, options?: { isEditing?: boolean }): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.familyName.trim()) {
    errors.familyName = 'Haushalt/Familie ist erforderlich'
  }

  if (!data.contactName.trim()) {
    errors.contactName = 'Ansprechpartner ist erforderlich'
  }

  if (!options?.isEditing) {
    if (!data.email || !data.email.trim()) {
      errors.email = 'E-Mail-Adresse ist erforderlich'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email.trim())) {
        errors.email = 'Bitte gib eine gültige E-Mail-Adresse ein'
      }
    }
  } else if (data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Bitte gib eine gültige E-Mail-Adresse ein'
    }
  }

  if (data.adultsCount < 1) {
    errors.adultsCount = 'Mindestens 1 Erwachsener erforderlich'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

type Step2Data = Pick<Registration, 'food'>

export function validateStep2(data: Step2Data): ValidationResult {
  const errors: Record<string, string> = {}

  if (data.food.bringsCake && !data.food.cakeDescription.trim()) {
    errors.cakeDescription = 'Bitte beschreibe den Kuchen'
  }

  if (data.food.bringsSalad && !data.food.saladDescription.trim()) {
    errors.saladDescription = 'Bitte beschreibe den Salat'
  }

  if (data.food.bringsOther && !data.food.otherDescription?.trim()) {
    errors.otherDescription = 'Bitte beschreibe, was du mitbringst'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

type Step3Data = Pick<Registration, 'camping'>

export function validateStep3(data: Step3Data): ValidationResult {
  const errors: Record<string, string> = {}

  if (data.camping.wantsCamping && data.camping.tentCount < 1) {
    errors.tentCount = 'Mindestens 1 Zelt erforderlich'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
