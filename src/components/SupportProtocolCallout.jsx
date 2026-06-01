// src/components/SupportProtocolCallout.jsx — 2026-06-01
//
// Reaching-out-for-support protocol. Same shape on both partner hubs with the
// counterpart's name interpolated so neither partner has to remember the
// sequence cold. Keeps the bar high on Acculynx as the documentation channel.

import React from 'react';

const PARTNER_LABEL = {
  theo: { self: 'Theo', other: 'Jerry' },
  jerry: { self: 'Jerry', other: 'Theo' },
  test: { self: 'Test', other: 'Partner' },
};

export default function SupportProtocolCallout({ partner }) {
  const counterpart = PARTNER_LABEL[partner]?.other ?? 'your partner';

  return (
    <section className="support-protocol-callout hub-section" aria-label="Reaching out for support">
      <div className="support-protocol-callout__eyebrow">REACHING OUT FOR SUPPORT</div>
      <h3 className="support-protocol-callout__heading">
        Sit with it first. Then reach out clean.
      </h3>
      <ol className="support-protocol-callout__steps">
        <li>
          <strong>5-10 minutes alone with the question.</strong> Most of the time the answer surfaces
          in that quiet. Write down what you've tried and what you actually need from {counterpart}.
        </li>
        <li>
          <strong>Call {counterpart} first.</strong> Voice beats text for anything substantive.
          Speaking to {counterpart} live is always step one if available.
        </li>
        <li>
          <strong>No answer? Send a text asking for a callback.</strong> Be specific about what
          you need and how urgent it is so {counterpart} can prioritize honestly.
        </li>
        <li>
          <strong>If the question is about information, document it in Acculynx.</strong> Send the
          task to {counterpart} with a clear deadline. Acculynx is where information lives — not
          texts, not memory.
        </li>
      </ol>
      <p className="support-protocol-callout__footer">
        Default to partner conversation first. Fall through the steps only when the channel above
        isn't available.
      </p>
    </section>
  );
}
