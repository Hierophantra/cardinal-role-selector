import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ProgressBar from './ProgressBar.jsx';
import ScreenPurpose from './screens/ScreenPurpose.jsx';
import ScreenSales from './screens/ScreenSales.jsx';
import ScreenOwnership from './screens/ScreenOwnership.jsx';
import ScreenCapacity from './screens/ScreenCapacity.jsx';
import ScreenLifeBalance from './screens/ScreenLifeBalance.jsx';
import ScreenAuthority from './screens/ScreenAuthority.jsx';
import ScreenMirror from './screens/ScreenMirror.jsx';
import ScreenDelegate from './screens/ScreenDelegate.jsx';
import ScreenVision from './screens/ScreenVision.jsx';
import ScreenConfirmation from './screens/ScreenConfirmation.jsx';
import { upsertSubmission, fetchSubmission } from '../lib/supabase.js';
import { STEPS } from '../data/content.js';

const VALID_PARTNERS = { theo: 'Theo', jerry: 'Jerry', test: 'Test' };

const emptyAnswers = {
  purpose_orientation: null,
  sales_position: null,
  ownership_claims: {},
  time_capacity: { hours: null, schedule: null, after_hours: null, field_presence: null },
  life_balance: { q1: null, q2: null, q3: null },
  decision_authority: {},
  honest_mirror: {},
  delegate_tomorrow: { selections: [], other: '' },
  vision_role: '',
  vision_week: '',
};

export default function Questionnaire() {
  const { partner } = useParams();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!VALID_PARTNERS[partner]) {
    navigate('/', { replace: true });
    return null;
  }

  const partnerName = VALID_PARTNERS[partner];
  const totalSteps = STEPS.length;


  // On mount, if this partner already has a submission, pre-populate the form state
  // and jump directly to the confirmation screen. They can review, go back to edit
  // any screen, or start over — no more "you already submitted" dead-end.
  useEffect(() => {
    fetchSubmission(partner)
      .then((existing) => {
        if (existing) {
          setAnswers({
            purpose_orientation: existing.purpose_orientation ?? null,
            sales_position: existing.sales_position ?? null,
            ownership_claims: existing.ownership_claims ?? {},
            time_capacity: existing.time_capacity ?? { hours: null, schedule: null, after_hours: null, field_presence: null },
            life_balance: existing.life_balance ?? { q1: null, q2: null, q3: null },
            decision_authority: existing.decision_authority ?? {},
            honest_mirror: existing.honest_mirror ?? {},
            delegate_tomorrow: existing.delegate_tomorrow ?? { selections: [], other: '' },
            vision_role: existing.vision_role ?? '',
            vision_week: existing.vision_week ?? '',
          });
          setStep(STEPS.indexOf('confirmation'));
        }
      })
      .catch(console.error)
      .finally(() => setChecking(false));
  }, [partner]);

  function updateAnswers(patch) {
    setAnswers((prev) => ({ ...prev, ...patch }));
  }

  const claimedFunctions = useMemo(
    () =>
      Object.entries(answers.ownership_claims)
        .filter(([, v]) => v === 'own')
        .map(([k]) => k),
    [answers.ownership_claims]
  );

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      await upsertSubmission({
        partner,
        purpose_orientation: answers.purpose_orientation,
        sales_position: answers.sales_position,
        ownership_claims: answers.ownership_claims,
        time_capacity: answers.time_capacity,
        life_balance: answers.life_balance,
        decision_authority: answers.decision_authority,
        honest_mirror: answers.honest_mirror,
        delegate_tomorrow: answers.delegate_tomorrow,
        vision_role: answers.vision_role,
        vision_week: answers.vision_week,
      });
      setStep(totalSteps - 1);
    } catch (err) {
      console.error(err);
      setSubmitError('Could not save your submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (step === totalSteps - 2) {
      handleSubmit();
    } else {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function goToHub() {
    navigate(`/hub/${partner}`);
  }
  function startOver() {
    setAnswers(emptyAnswers);
    setStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const common = {
    partnerName,
    answers,
    updateAnswers,
    next,
    back,
    claimedFunctions,
  };

  const screens = {
    purpose: <ScreenPurpose {...common} />,
    sales: <ScreenSales {...common} />,
    ownership: <ScreenOwnership {...common} />,
    capacity: <ScreenCapacity {...common} />,
    balance: <ScreenLifeBalance {...common} />,
    authority: <ScreenAuthority {...common} />,
    mirror: <ScreenMirror {...common} />,
    delegate: <ScreenDelegate {...common} />,
    vision: <ScreenVision {...common} submitting={submitting} submitError={submitError} />,
    confirmation: (
      <ScreenConfirmation
        {...common}
        goToHub={goToHub}
        startOver={partner === 'test' ? startOver : undefined}
      />
    ),
  };

  const currentKey = STEPS[step];

  // Loading state while we check Supabase
  if (checking) {
    return (
      <div className="app-shell">
        <div className="app-header">
          <div className="brand">
            <img src="/logo.png" alt="Cardinal" />
            <span>Role Definition Tool</span>
          </div>
        </div>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p className="muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="brand">
          <img src="/logo.png" alt="Cardinal" />
          <span>Role Definition Tool</span>
        </div>
        <div className="partner-tag">{partnerName}</div>
      </div>
      <ProgressBar current={step + 1} total={totalSteps} />
      <div className="container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {screens[currentKey]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
