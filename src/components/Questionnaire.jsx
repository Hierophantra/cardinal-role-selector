import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!VALID_PARTNERS[partner]) {
    navigate('/', { replace: true });
    return null;
  }

  const partnerName = VALID_PARTNERS[partner];

  // On mount, check if this partner already has a submission
  useEffect(() => {
    fetchSubmission(partner)
      .then((existing) => {
        if (existing) setAlreadySubmitted(true);
      })
      .catch(console.error)
      .finally(() => setChecking(false));
  }, [partner]);

  const totalSteps = STEPS.length;

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
    confirmation: <ScreenConfirmation {...common} />,
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

  // Already submitted state
  if (alreadySubmitted && step !== totalSteps - 1) {
    return (
      <div className="app-shell">
        <div className="app-header">
          <div className="brand">
            <img src="/logo.png" alt="Cardinal" />
            <span>Role Definition Tool</span>
          </div>
          <div className="partner-tag">{partnerName}</div>
        </div>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(45, 143, 94, 0.15)',
              border: '1px solid rgba(45, 143, 94, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 28,
            }}>
              ✓
            </div>
            <div className="eyebrow" style={{ color: 'var(--success)', marginBottom: 12 }}>Already Submitted</div>
            <h2 style={{ fontSize: 26, marginBottom: 14 }}>
              You've already completed this, {partnerName}.
            </h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.65, fontSize: 15 }}>
              Your responses have been recorded and are with Trace for review.
              If you need to make a change or have any questions, reach out to Trace directly.
            </p>
            <div style={{
              marginTop: 32,
              padding: '16px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 14,
              color: 'var(--muted)',
            }}>
              Questions? Contact Trace Curry.
            </div>
          </motion.div>
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
