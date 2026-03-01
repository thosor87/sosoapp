import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/features/auth/store'
import { useRegistrationStore } from '@/features/registration/store'
import { useToastStore } from '@/components/feedback/Toast'
import { validateStep1, validateStep2, validateStep3 } from '@/features/registration/validation'
import { NumberStepper } from './NumberStepper'
import type { Registration } from '@/lib/firebase/types'

interface RegistrationFormProps {
  editRegistration?: Registration
  onClose?: () => void
}

interface FormData {
  familyName: string
  contactName: string
  adultsCount: number
  childrenCount: number
  food: {
    bringsCake: boolean
    cakeDescription: string
    bringsSalad: boolean
    saladDescription: string
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
      adultsCount: reg.adultsCount,
      childrenCount: reg.childrenCount,
      food: { ...reg.food },
      camping: { ...reg.camping, personCount: reg.camping.personCount ?? 0 },
      comments: reg.comments,
    }
  }
  return {
    familyName: '',
    contactName: '',
    adultsCount: 1,
    childrenCount: 0,
    food: {
      bringsCake: false,
      cakeDescription: '',
      bringsSalad: false,
      saladDescription: '',
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
  const createRegistration = useRegistrationStore((s) => s.createRegistration)
  const updateRegistration = useRegistrationStore((s) => s.updateRegistration)
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

  const isEditing = !!editRegistration

  const existingFood = useMemo(() => {
    const cakes = registrations
      .filter((r) => r.food.bringsCake && r.food.cakeDescription)
      .filter((r) => !editRegistration || r.id !== editRegistration.id)
      .map((r) => ({ family: r.familyName, description: r.food.cakeDescription }))
    const salads = registrations
      .filter((r) => r.food.bringsSalad && r.food.saladDescription)
      .filter((r) => !editRegistration || r.id !== editRegistration.id)
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
    const names = matches.map((m) => `„${m.description}" (${m.family})`).join(', ')
    return `Kommt schon von: ${names}`
  }, [formData.food.cakeDescription, existingFood.cakes])

  const saladDuplicateHint = useMemo(() => {
    if (!formData.food.saladDescription.trim()) return null
    const input = formData.food.saladDescription.toLowerCase().trim()
    const matches = existingFood.salads.filter((s) =>
      s.description.toLowerCase().trim().includes(input) ||
      input.includes(s.description.toLowerCase().trim())
    )
    if (matches.length === 0) return null
    const names = matches.map((m) => `„${m.description}" (${m.family})`).join(', ')
    return `Kommt schon von: ${names}`
  }, [formData.food.saladDescription, existingFood.salads])

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setErrors({})
    },
    []
  )

  const updateFood = useCallback(
    <K extends keyof FormData['food']>(
      field: K,
      value: FormData['food'][K]
    ) => {
      setFormData((prev) => ({
        ...prev,
        food: { ...prev.food, [field]: value },
      }))
      setErrors({})
    },
    []
  )

  const updateCamping = useCallback(
    <K extends keyof FormData['camping']>(
      field: K,
      value: FormData['camping'][K]
    ) => {
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

    if (step === 0) {
      result = validateStep1(formData)
    } else if (step === 1) {
      result = validateStep2(formData)
    } else if (step === 2) {
      result = validateStep3(formData)
    }

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
      if (isEditing && editRegistration) {
        await updateRegistration(editRegistration.id, {
          familyName: formData.familyName,
          contactName: formData.contactName,
          adultsCount: formData.adultsCount,
          childrenCount: formData.childrenCount,
          food: formData.food,
          camping: formData.camping,
          comments: formData.comments,
        })
        addToast('Änderungen gespeichert!', 'success')
        onClose?.()
      } else {
        await createRegistration({
          eventId,
          familyName: formData.familyName,
          contactName: formData.contactName,
          adultsCount: formData.adultsCount,
          childrenCount: formData.childrenCount,
          food: formData.food,
          camping: formData.camping,
          comments: formData.comments,
        })
        addToast('Anmeldung erfolgreich!', 'success')
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
          setStep(0)
          setFormData(getInitialData())
        }, 3000)
      }
    } catch (error) {
      console.error('Registration error:', error)
      addToast('Fehler beim Speichern. Bitte versuche es erneut.', 'error')
    } finally {
      setIsSubmitting(false)
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
                <svg
                  className="w-10 h-10 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
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
              {/* Confetti particles */}
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
                  style={{
                    backgroundColor: [
                      '#F97316',
                      '#14B8A6',
                      '#FBBF24',
                      '#EC4899',
                      '#8B5CF6',
                      '#10B981',
                    ][i % 6],
                  }}
                />
              ))}
            </div>
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl font-display font-bold text-warm-800 mb-2"
          >
            Perfekt!
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-warm-500 text-center"
          >
            Deine Anmeldung wurde erfolgreich gespeichert.
          </motion.p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Step Indicator */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (i < step) {
                    setDirection(i < step ? -1 : 1)
                    setStep(i)
                  }
                }}
                className={`flex flex-col items-center gap-1 cursor-pointer ${
                  i <= step ? 'cursor-pointer' : 'cursor-default'
                }`}
                disabled={i > step}
              >
                <motion.div
                  animate={{
                    scale: i === step ? 1.1 : 1,
                    backgroundColor:
                      i < step
                        ? '#14B8A6'
                        : i === step
                          ? '#F97316'
                          : '#E7E5E4',
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm"
                >
                  {i < step ? (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span
                      className={
                        i === step ? 'text-white' : 'text-warm-400'
                      }
                    >
                      {s.icon}
                    </span>
                  )}
                </motion.div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    i === step
                      ? 'text-primary-600'
                      : i < step
                        ? 'text-secondary-600'
                        : 'text-warm-400'
                  }`}
                >
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
      <div className="px-6 pb-6 min-h-[320px] relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-display font-bold text-warm-800 mb-1">
                  Wer kommt?
                </h3>
                <p className="text-sm text-warm-500">
                  Erzähl uns, wer dabei ist!
                </p>
              </div>

              <Input
                label="Familienname"
                value={formData.familyName}
                onChange={(e) => updateField('familyName', e.target.value)}
                placeholder="z.B. Müller"
                error={errors.familyName}
              />

              <Input
                label="Ansprechpartner"
                value={formData.contactName}
                onChange={(e) => updateField('contactName', e.target.value)}
                placeholder="Vorname"
                error={errors.contactName}
              />

              <div className="grid grid-cols-2 gap-4">
                <NumberStepper
                  label="Erwachsene"
                  value={formData.adultsCount}
                  onChange={(v) => updateField('adultsCount', v)}
                  min={1}
                  max={20}
                  error={errors.adultsCount}
                />
                <NumberStepper
                  label="Kinder"
                  value={formData.childrenCount}
                  onChange={(v) => updateField('childrenCount', v)}
                  min={0}
                  max={20}
                />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-display font-bold text-warm-800 mb-1">
                  Was bringst du mit?
                </h3>
                <p className="text-sm text-warm-500">
                  Jeder Beitrag hilft! {'\uD83C\uDF82\uD83E\uDD57'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-warm-100 p-4 space-y-3">
                  <Toggle
                    checked={formData.food.bringsCake}
                    onChange={(checked) => {
                      updateFood('bringsCake', checked)
                      if (!checked) updateFood('cakeDescription', '')
                    }}
                    label="Ich bringe Kuchen mit"
                  />
                  <AnimatePresence>
                    {formData.food.bringsCake && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-2"
                      >
                        <Textarea
                          label="Welchen Kuchen?"
                          value={formData.food.cakeDescription}
                          onChange={(e) =>
                            updateFood('cakeDescription', e.target.value)
                          }
                          placeholder="z.B. Schokoladenkuchen, Erdbeertorte..."
                          error={errors.cakeDescription}
                        />
                        {cakeDuplicateHint && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <span>{'\u26A0\uFE0F'}</span> {cakeDuplicateHint}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {existingFood.cakes.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-warm-400 mb-1.5">
                        Bereits gemeldet:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {existingFood.cakes.map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-warm-50 rounded-full px-2.5 py-1 text-warm-500 border border-warm-100"
                          >
                            {c.description}
                            <span className="text-warm-300">({c.family})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-warm-100 p-4 space-y-3">
                  <Toggle
                    checked={formData.food.bringsSalad}
                    onChange={(checked) => {
                      updateFood('bringsSalad', checked)
                      if (!checked) updateFood('saladDescription', '')
                    }}
                    label="Ich bringe Salat mit"
                  />
                  <AnimatePresence>
                    {formData.food.bringsSalad && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-2"
                      >
                        <Textarea
                          label="Welchen Salat?"
                          value={formData.food.saladDescription}
                          onChange={(e) =>
                            updateFood('saladDescription', e.target.value)
                          }
                          placeholder="z.B. Nudelsalat, Griechischer Salat..."
                          error={errors.saladDescription}
                        />
                        {saladDuplicateHint && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <span>{'\u26A0\uFE0F'}</span> {saladDuplicateHint}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {existingFood.salads.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-warm-400 mb-1.5">
                        Bereits gemeldet:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {existingFood.salads.map((s, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-warm-50 rounded-full px-2.5 py-1 text-warm-500 border border-warm-100"
                          >
                            {s.description}
                            <span className="text-warm-300">({s.family})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-display font-bold text-warm-800 mb-1">
                  Übernachten?
                </h3>
                <p className="text-sm text-warm-500">
                  Möchtest du auf dem Gelände zelten?
                </p>
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
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <NumberStepper
                          label="Anzahl Zelte"
                          value={formData.camping.tentCount}
                          onChange={(v) => updateCamping('tentCount', v)}
                          min={1}
                          max={10}
                          error={errors.tentCount}
                        />
                        <NumberStepper
                          label="Personen zelten"
                          value={formData.camping.personCount}
                          onChange={(v) => updateCamping('personCount', v)}
                          min={1}
                          max={50}
                        />
                      </div>
                      <Textarea
                        label="Anmerkungen zum Zelten"
                        value={formData.camping.notes}
                        onChange={(e) =>
                          updateCamping('notes', e.target.value)
                        }
                        placeholder="z.B. Brauchen wir Strom?"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Textarea
                label="Sonstige Anmerkungen"
                value={formData.comments}
                onChange={(e) => updateField('comments', e.target.value)}
                placeholder="Allergien, besondere Wünsche..."
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-display font-bold text-warm-800 mb-1">
                  Zusammenfassung
                </h3>
                <p className="text-sm text-warm-500">
                  Alles richtig? Dann ab damit!
                </p>
              </div>

              <div className="space-y-3">
                {/* Family info */}
                <div className="rounded-xl bg-warm-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-warm-600">
                    <span>{'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'}</span>
                    <span>Familie</span>
                  </div>
                  <p className="font-semibold text-warm-800">
                    {formData.familyName}
                  </p>
                  <p className="text-sm text-warm-500">
                    Ansprechpartner: {formData.contactName}
                  </p>
                  <p className="text-sm text-warm-500">
                    {formData.adultsCount} Erwachsene
                    {formData.childrenCount > 0 &&
                      `, ${formData.childrenCount} Kinder`}
                  </p>
                </div>

                {/* Food */}
                <div className="rounded-xl bg-warm-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-warm-600">
                    <span>{'\uD83C\uDF7D\uFE0F'}</span>
                    <span>Mitgebracht</span>
                  </div>
                  {formData.food.bringsCake || formData.food.bringsSalad ? (
                    <div className="space-y-1">
                      {formData.food.bringsCake && (
                        <p className="text-sm text-warm-700">
                          {'\uD83C\uDF70'} {formData.food.cakeDescription}
                        </p>
                      )}
                      {formData.food.bringsSalad && (
                        <p className="text-sm text-warm-700">
                          {'\uD83E\uDD57'} {formData.food.saladDescription}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-warm-400 italic">
                      Nichts - ist auch völlig in Ordnung!
                    </p>
                  )}
                </div>

                {/* Camping */}
                <div className="rounded-xl bg-warm-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-warm-600">
                    <span>{'\u26FA'}</span>
                    <span>Zelten</span>
                  </div>
                  {formData.camping.wantsCamping ? (
                    <div className="space-y-1">
                      <p className="text-sm text-warm-700">
                        {formData.camping.tentCount}{' '}
                        {formData.camping.tentCount === 1 ? 'Zelt' : 'Zelte'}
                        {formData.camping.personCount > 0 &&
                          `, ${formData.camping.personCount} ${formData.camping.personCount === 1 ? 'Person' : 'Personen'}`}
                      </p>
                      {formData.camping.notes && (
                        <p className="text-sm text-warm-500">
                          {formData.camping.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-warm-400 italic">
                      Kein Zelten
                    </p>
                  )}
                </div>

                {/* Comments */}
                {formData.comments && (
                  <div className="rounded-xl bg-warm-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-warm-600">
                      <span>{'\uD83D\uDCDD'}</span>
                      <span>Anmerkungen</span>
                    </div>
                    <p className="text-sm text-warm-700">
                      {formData.comments}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={goBack} type="button">
            Zurück
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button onClick={goNext} type="button">
            Weiter
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            type="button"
          >
            {isSubmitting
              ? 'Wird gespeichert...'
              : isEditing
                ? 'Änderungen speichern'
                : 'Anmeldung absenden'}
          </Button>
        )}
      </div>
    </Card>
  )
}
