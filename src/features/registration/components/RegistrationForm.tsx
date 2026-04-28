import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/features/auth/store'
import { useRegistrationStore, FOOD_LIMIT_DEFAULT } from '@/features/registration/store'
import { useToastStore } from '@/components/feedback/Toast'
import { validateStep1, validateStep2, validateStep3 } from '@/features/registration/validation'
import { NumberStepper } from './NumberStepper'
import type { Registration } from '@/lib/firebase/types'
import { sendConfirmationEmail, sendUpdateEmail, sendDeletionEmail } from '@/lib/firebase/sendConfirmationEmail'

interface RegistrationFormProps {
  editRegistration?: Registration
  onClose?: () => void
}

interface FormData {
  familyName: string
  contactName: string
  email: string
  adultsCount: number
  childrenCount: number
  food: {
    bringsCake: boolean
    cakeDescription: string
    bringsSalad: boolean
    saladDescription: string
    bringsOther: boolean
    otherDescription: string
  }
  camping: {
    wantsCamping: boolean
    tentCount: number
    personCount: number
    notes: string
  }
  comments: string
}

const STEPS = [
  { label: 'Wer kommt?', icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66' },
  { label: 'Mitbringen', icon: '\uD83C\uDF70' },
  { label: 'Zelten', icon: '\u26FA' },
  { label: 'Fertig', icon: '\u2705' },
]

function getInitialData(reg?: Registration): FormData {
  if (reg) {
    return {
      familyName: reg.familyName,
      contactName: reg.contactName,
      email: '',
      adultsCount: reg.adultsCount,
      childrenCount: reg.childrenCount,
      food: {
        bringsCake: reg.food.bringsCake,
        cakeDescription: reg.food.cakeDescription,
        bringsSalad: reg.food.bringsSalad,
        saladDescription: reg.food.saladDescription,
        bringsOther: reg.food.bringsOther ?? false,
        otherDescription: reg.food.otherDescription ?? '',
      },
      camping: { ...reg.camping, personCount: reg.camping.personCount ?? 0 },
      comments: reg.comments,
    }
  }
  return {
    familyName: '',
    contactName: '',
    email: '',
    adultsCount: 1,
    childrenCount: 0,
    food: {
      bringsCake: false,
      cakeDescription: '',
      bringsSalad: false,
      saladDescription: '',
      bringsOther: false,
      otherDescription: '',
    },
    camping: {
      wantsCamping: false,
      tentCount: 0,
      personCount: 0,
      notes: '',
    },
    comments: '',
  }
}

export function RegistrationForm({ editRegistration, onClose }: RegistrationFormProps) {
  const eventId = useAuthStore((s) => s.eventId)
  const accessToken = useAuthStore((s) => s.accessToken)
  const cakeLimit = useAuthStore((s) => s.eventConfig?.cakeLimit ?? FOOD_LIMIT_DEFAULT)
  const saladLimit = useAuthStore((s) => s.eventConfig?.saladLimit ?? FOOD_LIMIT_DEFAULT)
  const createRegistration = useRegistrationStore((s) => s.createRegistration)
  const updateRegistration = useRegistrationStore((s) => s.updateRegistration)
  const deleteRegistration = useRegistrationStore((s) => s.deleteRegistration)
  const registrations = useRegistrationStore((s) => s.registrations)
  const addToast = useToastStore((s) => s.addToast)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [formData, setFormData] = useState<FormData>(() =>
    getInitialData(editRegistration)
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isEditing = !!editRegistration

  // Food counts (excluding current edit)
  const foodCounts = useMemo(() => {
    const others = registrations.filter((r) => !editRegistration || r.id !== editRegistration.id)
    return {
      cakes: others.filter((r) => r.food.bringsCake).length,
      salads: others.filter((r) => r.food.bringsSalad).length,
    }
  }, [registrations, editRegistration])

  const cakeLimitReached = foodCounts.cakes >= cakeLimit
  const saladLimitReached = foodCounts.salads >= saladLimit

  // Smart food hint – only when clearly imbalanced (one side ≥ 2× the other, min. 4 of the bigger)
  const foodHint = useMemo(() => {
    const { cakes, salads } = foodCounts
    if (cakes >= 4 && cakes >= salads * 2) {
      return { emoji: '\uD83E\uDD57', text: `Salat wäre prima! Es gibt schon ${cakes} Kuchen, aber erst ${salads} Salat${salads === 1 ? '' : 'e'}.` }
    }
    if (salads >= 4 && salads >= cakes * 2) {
      return { emoji: '\uD83C\uDF82', text: `Kuchen wäre super! Es gibt schon ${salads} Salate, aber erst ${cakes} Kuchen.` }
    }
    return null
  }, [foodCounts])

  const existingFood = useMemo(() => {
    const base = registrations.filter((r) => !editRegistration || r.id !== editRegistration.id)
    const cakes = base
      .filter((r) => r.food.bringsCake && r.food.cakeDescription)
      .map((r) => ({ family: r.familyName, description: r.food.cakeDescription }))
    const salads = base
      .filter((r) => r.food.bringsSalad && r.food.saladDescription)
      .map((r) => ({ family: r.familyName, description: r.food.saladDescription }))
    return { cakes, salads }
  }, [registrations, editRegistration])

  const cakeDuplicateHint = useMemo(() => {
    if (!formData.food.cakeDescription.trim()) return null
    const input = formData.food.cakeDescription.toLowerCase().trim()
    const matches = existingFood.cakes.filter((c) =>
      c.description.toLowerCase().trim().includes(input) ||
      input.includes(c.description.toLowerCase().trim())
    )
    if (matches.length === 0) return null
    return `Kommt schon von: ${matches.map((m) => `„${m.description}" (${m.family})`).join(', ')}`
  }, [formData.food.cakeDescription, existingFood.cakes])

  const saladDuplicateHint = useMemo(() => {
    if (!formData.food.saladDescription.trim()) return null
    const input = formData.food.saladDescription.toLowerCase().trim()
    const matches = existingFood.salads.filter((s) =>
      s.description.toLowerCase().trim().includes(input) ||
      input.includes(s.description.toLowerCase().trim())
    )
    if (matches.length === 0) return null
    return `Kommt schon von: ${matches.map((m) => `„${m.description}" (${m.family})`).join(', ')}`
  }, [formData.food.saladDescription, existingFood.salads])

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setErrors({})
    },
    []
  )

  const updateFood = useCallback(
    <K extends keyof FormData['food']>(field: K, value: FormData['food'][K]) => {
      setFormData((prev) => ({
        ...prev,
        food: { ...prev.food, [field]: value },
      }))
      setErrors({})
    },
    []
  )

  const updateCamping = useCallback(
    <K extends keyof FormData['camping']>(field: K, value: FormData['camping'][K]) => {
      setFormData((prev) => ({
        ...prev,
        camping: { ...prev.camping, [field]: value },
      }))
      setErrors({})
    },
    []
  )

  const goNext = () => {
    let result = { valid: true, errors: {} as Record<string, string> }
    if (step === 0) result = validateStep1(formData)
    else if (step === 1) result = validateStep2(formData)
    else if (step === 2) result = validateStep3(formData)

    if (!result.valid) {
      setErrors(result.errors)
      return
    }
    setDirection(1)
    setStep((s) => Math.min(s + 1, 3))
  }

  const goBack = () => {
    setDirection(-1)
    setStep((s) => Math.max(s - 1, 0))
  }

  const handleSubmit = async () => {
    if (!eventId) return
    setIsSubmitting(true)
    try {
      const email = formData.email.trim()
      const registrationData = {
        familyName: formData.familyName,
        contactName: formData.contactName,
        adultsCount: formData.adultsCount,
        childrenCount: formData.childrenCount,
        food: formData.food,
        camping: formData.camping,
        comments: formData.comments,
      }

      if (isEditing && editRegistration) {
        await updateRegistration(editRegistration.id, registrationData, email)
        if (email && accessToken) {
          sendUpdateEmail(
            { ...registrationData, id: editRegistration.id, email },
            accessToken
          ).catch((err) => console.error('Update email failed:', err))
        }
        addToast('Änderungen gespeichert!', 'success')
        onClose?.()
      } else {
        const regId = await createRegistration({ eventId, ...registrationData }, email)
        if (email && accessToken) {
          sendConfirmationEmail(
            { ...registrationData, id: regId, email },
            accessToken
          ).catch((err) => console.error('Email send failed:', err))
        }
        addToast('Anmeldung erfolgreich!', 'success')
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
          setStep(0)
          setFormData(getInitialData())
        }, 3000)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fehler beim Speichern. Bitte versuche es erneut.'
      addToast(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnregister = async () => {
    if (!editRegistration) return
    setIsDeleting(true)
    try {
      const email = formData.email.trim()
      if (email) {
        sendDeletionEmail({
          id: editRegistration.id,
          contactName: editRegistration.contactName,
          email,
          familyName: editRegistration.familyName,
          adultsCount: editRegistration.adultsCount,
          childrenCount: editRegistration.childrenCount,
          food: editRegistration.food,
          camping: editRegistration.camping,
          comments: editRegistration.comments,
        }).catch((err) => console.error('Deletion email failed:', err))
      }
      await deleteRegistration(editRegistration.id)
      setShowUnregisterConfirm(false)
      onClose?.()
    } catch (error) {
      console.error('Unregister error:', error)
      addToast('Fehler beim Abmelden. Bitte versuche es erneut.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  }

  if (showSuccess) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="mb-6"
          >
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"
              >
                <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((i * 30 * Math.PI) / 180) * 60,
                    y: Math.sin((i * 30 * Math.PI) / 180) * 60,
                    scale: [0, 1.2, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: ['#F97316','#14B8A6','#FBBF24','#EC4899','#8B5CF6','#10B981'][i % 6] }}
                />
              ))}
            </div>
          </motion.div>
          <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-xl font-display font-bold text-warm-800 mb-2">
            Perfekt!
          </motion.h3>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-warm-500 text-center">
            Deine Anmeldung wurde erfolgreich gespeichert.
          </motion.p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden flex flex-col max-h-[85dvh]">
      {/* Step Indicator */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => { if (i < step) { setDirection(i < step ? -1 : 1); setStep(i) } }}
                className={`flex flex-col items-center gap-1 cursor-pointer ${i <= step ? 'cursor-pointer' : 'cursor-default'}`}
                disabled={i > step}
              >
                <motion.div
                  animate={{
                    scale: i === step ? 1.1 : 1,
                    backgroundColor: i < step ? '#14B8A6' : i === step ? '#F97316' : '#E7E5E4',
                  }}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm"
                >
                  {i < step ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={i === step ? 'text-white' : 'text-warm-400'}>{s.icon}</span>
                  )}
                </motion.div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-primary-600' : i < step ? 'text-secondary-600' : 'text-warm-400'}`}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 rounded-full overflow-hidden bg-warm-200">
                  <motion.div
                    animate={{ width: i < step ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-secondary-500 rounded-full"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-6 pb-4 flex-1 overflow-y-auto min-h-0 relative">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div key="step-0" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }} className="space-y-5">
              <div>
                <h3 className="text-lg font-display font-bold text-warm-800 mb-1">Wer kommt?</h3>
                <p className="text-sm text-warm-500">Erzähl uns, wer dabei ist!</p>
              </div>
              <Input label="Haushalt/Familie" value={formData.familyName} onChange={(e) => updateField('familyName', e.target.value)} placeholder="z.B. Sorings im Norden" error={errors.familyName} />
              <Input label="Ansprechpartner" value={formData.contactName} onChange={(e) => updateField('contactName', e.target.value)} placeholder="Vorname" error={errors.contactName} />
              <div>
                <Input
                  label="E-Mail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="fuer-bestaetigung@beispiel.de"
                  error={errors.email}
                />
                <p className="text-xs text-warm-400 mt-1">
                  {isEditing
                    ? 'Du bekommst eine Bestätigung. Die Adresse kann sich gegenüber der ersten Anmeldung unterscheiden.'
                    : 'Du bekommst eine Bestätigung mit Bearbeitungslink'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumberStepper label="Erwachsene" value={formData.adultsCount} onChange={(v) => updateField('adultsCount', v)} min={1} max={20} error={errors.adultsCount} />
                <NumberStepper label="Kinder" value={formData.childrenCount} onChange={(v) => updateField('childrenCount', v)} min={0} max={20} />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step-1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }} className="space-y-5">
              <div>
                <h3 className="text-lg font-display font-bold text-warm-800 mb-1">Was bringst du mit?</h3>
                <p className="text-sm text-warm-500">Jeder Beitrag hilft! {'\uD83C\uDF82\uD83E\uDD57'}</p>
              </div>

              {/* Smart food hint */}
              {foodHint && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2"
                >
                  <span className="text-lg shrink-0">{foodHint.emoji}</span>
                  <p className="text-sm text-amber-800">{foodHint.text}</p>
                </motion.div>
              )}

              <div className="space-y-4">
                {/* Kuchen */}
                <div className="rounded-xl border border-warm-100 p-4 space-y-3">
                  {cakeLimitReached && !formData.food.bringsCake ? (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <span>🎂</span>
                      <span>Kuchen-Kontingent voll ({cakeLimit}/{cakeLimit}) – danke an alle!</span>
                    </div>
                  ) : (
                    <Toggle
                      checked={formData.food.bringsCake}
                      onChange={(checked) => {
                        updateFood('bringsCake', checked)
                        if (!checked) updateFood('cakeDescription', '')
                      }}
                      label="Ich bringe Kuchen mit"
                    />
                  )}
                  <AnimatePresence>
                    {formData.food.bringsCake && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-2">
                        <Textarea label="Welchen Kuchen?" value={formData.food.cakeDescription} onChange={(e) => updateFood('cakeDescription', e.target.value)} placeholder="z.B. Schokoladenkuchen, Erdbeertorte..." error={errors.cakeDescription} />
                        {cakeDuplicateHint && (
                          <p className="text-xs text-amber-600 flex items-center gap-1"><span>{'\u26A0\uFE0F'}</span> {cakeDuplicateHint}</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Salat */}
                <div className="rounded-xl border border-warm-100 p-4 space-y-3">
                  {saladLimitReached && !formData.food.bringsSalad ? (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <span>🥗</span>
                      <span>Salat-Kontingent voll ({saladLimit}/{saladLimit}) – danke an alle!</span>
                    </div>
                  ) : (
                    <Toggle
                      checked={formData.food.bringsSalad}
                      onChange={(checked) => {
                        updateFood('bringsSalad', checked)
                        if (!checked) updateFood('saladDescription', '')
                      }}
                      label="Ich bringe Salat mit"
                    />
                  )}
                  <AnimatePresence>
                    {formData.food.bringsSalad && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-2">
                        <Textarea label="Welchen Salat?" value={formData.food.saladDescription} onChange={(e) => updateFood('saladDescription', e.target.value)} placeholder="z.B. Nudelsalat, Griechischer Salat..." error={errors.saladDescription} />
                        {saladDuplicateHint && (
                          <p className="text-xs text-amber-600 flex items-center gap-1"><span>{'\u26A0\uFE0F'}</span> {saladDuplicateHint}</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sonstiges */}
                <div className="rounded-xl border border-warm-100 p-4 space-y-3">
                  <Toggle
                    checked={formData.food.bringsOther}
                    onChange={(checked) => {
                      updateFood('bringsOther', checked)
                      if (!checked) updateFood('otherDescription', '')
                    }}
                    label="Ich bringe Sonstiges mit (z.B. Brot)"
                  />
                  <AnimatePresence>
                    {formData.food.bringsOther && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-2">
                        <Textarea label="Was bringst du mit?" value={formData.food.otherDescription} onChange={(e) => updateFood('otherDescription', e.target.value)} placeholder="z.B. Brot, Dips, Getränke..." error={errors.otherDescription} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step-2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }} className="space-y-5">
              <div>
                <h3 className="text-lg font-display font-bold text-warm-800 mb-1">Übernachten?</h3>
                <p className="text-sm text-warm-500">Möchtest du auf dem Gelände zelten?</p>
              </div>
              <div className="rounded-xl border border-warm-100 p-4 space-y-4">
                <Toggle
                  checked={formData.camping.wantsCamping}
                  onChange={(checked) => {
                    updateCamping('wantsCamping', checked)
                    if (!checked) {
                      updateCamping('tentCount', 0)
                      updateCamping('personCount', 0)
                      updateCamping('notes', '')
                    } else {
                      updateCamping('tentCount', 1)
                      updateCamping('personCount', formData.adultsCount + formData.childrenCount)
                    }
                  }}
                  label="Wir zelten mit!"
                />
                <AnimatePresence>
                  {formData.camping.wantsCamping && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <NumberStepper label="Anzahl Zelte" value={formData.camping.tentCount} onChange={(v) => updateCamping('tentCount', v)} min={1} max={10} error={errors.tentCount} />
                        <NumberStepper label="Personen" value={formData.camping.personCount} onChange={(v) => updateCamping('personCount', v)} min={1} max={50} />
                      </div>
                      <Textarea label="Anmerkungen zum Zelten" value={formData.camping.notes} onChange={(e) => updateCamping('notes', e.target.value)} placeholder="z.B. Besondere Wünsche zum Zelten" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Textarea label="Sonstige Anmerkungen" value={formData.comments} onChange={(e) => updateField('comments', e.target.value)} placeholder="Allergien, besondere Wünsche..." />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step-3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }} className="space-y-5">
              <div>
                <h3 className="text-lg font-display font-bold text-warm-800 mb-1">Zusammenfassung</h3>
                <p className="text-sm text-warm-500">Alles richtig? Dann ab damit!</p>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-warm-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-warm-600">
                    <span>{'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'}</span>
                    <span>Haushalt</span>
                  </div>
                  <p className="font-semibold text-warm-800">{formData.familyName}</p>
                  <p className="text-sm text-warm-500">Ansprechpartner: {formData.contactName}</p>
                  {formData.email.trim() && <p className="text-sm text-warm-500">E-Mail: {formData.email.trim()}</p>}
                  <p className="text-sm text-warm-500">
                    {formData.adultsCount} Erwachsene{formData.childrenCount > 0 && `, ${formData.childrenCount} Kinder`}
                  </p>
                </div>

                <div className="rounded-xl bg-warm-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-warm-600">
                    <span>{'\uD83C\uDF7D\uFE0F'}</span>
                    <span>Mitgebracht</span>
                  </div>
                  {formData.food.bringsCake || formData.food.bringsSalad || formData.food.bringsOther ? (
                    <div className="space-y-1">
                      {formData.food.bringsCake && <p className="text-sm text-warm-700">{'\uD83C\uDF70'} {formData.food.cakeDescription}</p>}
                      {formData.food.bringsSalad && <p className="text-sm text-warm-700">{'\uD83E\uDD57'} {formData.food.saladDescription}</p>}
                      {formData.food.bringsOther && <p className="text-sm text-warm-700">🍞 {formData.food.otherDescription}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-warm-400 italic">Nichts - ist auch völlig in Ordnung!</p>
                  )}
                </div>

                <div className="rounded-xl bg-warm-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-warm-600">
                    <span>{'\u26FA'}</span>
                    <span>Zelten</span>
                  </div>
                  {formData.camping.wantsCamping ? (
                    <div className="space-y-1">
                      <p className="text-sm text-warm-700">
                        {formData.camping.tentCount} {formData.camping.tentCount === 1 ? 'Zelt' : 'Zelte'}
                        {formData.camping.personCount > 0 && `, ${formData.camping.personCount} ${formData.camping.personCount === 1 ? 'Person' : 'Personen'}`}
                      </p>
                      {formData.camping.notes && <p className="text-sm text-warm-500">{formData.camping.notes}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-warm-400 italic">Kein Zelten</p>
                  )}
                </div>

                {formData.comments && (
                  <div className="rounded-xl bg-warm-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-warm-600">
                      <span>{'\uD83D\uDCDD'}</span>
                      <span>Anmerkungen</span>
                    </div>
                    <p className="text-sm text-warm-700">{formData.comments}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Unregister hint */}
      {isEditing && step === 0 && (
        <div className="px-6 pb-2">
          <button type="button" onClick={() => setShowUnregisterConfirm(true)} className="text-sm text-warm-400 hover:text-red-500 transition-colors cursor-pointer min-h-[44px] px-1">
            Wieder abmelden
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="px-4 sm:px-6 py-4 flex items-center gap-3 border-t border-warm-100 bg-white">
        {step > 0 && (
          <Button variant="ghost" onClick={goBack} type="button" className="shrink-0">Zurück</Button>
        )}
        <div className="flex-1">
          {step < 3 ? (
            <Button onClick={goNext} type="button" className="w-full">Weiter</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" type="button" className="w-full">
              {isSubmitting ? 'Wird gespeichert...' : isEditing ? 'Änderungen speichern' : 'Anmeldung absenden'}
            </Button>
          )}
        </div>
      </div>

      {/* Unregister Confirmation Modal */}
      <Modal isOpen={showUnregisterConfirm} onClose={() => setShowUnregisterConfirm(false)} title="Anmeldung zurückziehen?">
        <div className="space-y-4">
          <p className="text-sm text-warm-600">
            Möchtest du die Anmeldung für <strong>{formData.familyName}</strong> wirklich zurückziehen? Alle Daten werden unwiderruflich gelöscht.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowUnregisterConfirm(false)} type="button">Abbrechen</Button>
            <Button variant="outline" onClick={handleUnregister} disabled={isDeleting} type="button" className="!border-red-300 !text-red-600 hover:!bg-red-50">
              {isDeleting ? 'Wird gelöscht...' : 'Ja, abmelden'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
