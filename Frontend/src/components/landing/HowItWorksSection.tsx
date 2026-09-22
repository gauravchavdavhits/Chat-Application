import React from 'react';

interface StepItem {
  number: string;
  title: string;
  description: string;
  detail: string;
}

const STEPS: StepItem[] = [
  {
    number: '01',
    title: 'Create Your Account',
    description: 'Sign up with a unique username and email. Your credentials are fully salted and hashed before persistence.',
    detail: 'Instant verification & login',
  },
  {
    number: '02',
    title: 'Connect & Discover',
    description: 'Search for active contacts in the global directory or create custom group collaboration channels.',
    detail: 'Live status indicators',
  },
  {
    number: '03',
    title: 'Communicate Freely',
    description: 'Exchange instant direct messages, share images and GIFs, or launch browser-native voice and video calls.',
    detail: 'Lossless WebRTC & audio',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="section-pre-tag">WORKFLOW</div>
          <h2 className="landing-section-title">How the Application Works</h2>
          <p className="landing-section-desc">
            Get connected in three straightforward steps from any modern browser.
          </p>
        </div>

        <div className="landing-process-wrapper">
          {/* Subtle connecting gradient line for desktop */}
          <div className="process-timeline-bar" aria-hidden="true" />

          <div className="landing-steps-grid">
            {STEPS.map((step, idx) => (
              <div key={idx} className="landing-step-item">
                <div className="landing-step-num-badge">
                  <span>{step.number}</span>
                </div>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-desc">{step.description}</p>
                <div className="landing-step-footer">
                  <span className="step-detail-tag">✓ {step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
