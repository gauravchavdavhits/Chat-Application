import React, { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'How does real-time communication work without page reloads?',
    answer: 'The application uses persistent Socket.IO WebSockets over HTTP/HTTPS. When you send a message, it is instantly emitted to the server and dispatched directly to the recipient\'s active client socket without needing polling or page refreshing.',
  },
  {
    question: 'Is WebRTC used for voice and video calling?',
    answer: 'Yes. Video and audio calls use peer-to-peer WebRTC connections with interactive STUN/TURN ICE candidate exchange, delivering direct high-definition streams and browser screen sharing with minimal transmission latency.',
  },
  {
    question: 'What happens if a user is offline when a message is sent?',
    answer: 'Messages are durably stored in MongoDB Atlas via Mongoose models. When the offline user logs back in, their conversation history and unread counters are automatically fetched and rendered in chronological order.',
  },
  {
    question: 'Can I create and manage group chats?',
    answer: 'Yes. Users can create custom group channels, add or remove members, assign group names and avatars, and chat with all active group participants in synchronized real time.',
  },
  {
    question: 'How is user authentication secured?',
    answer: 'Authentication utilizes industry-standard JSON Web Tokens (JWT) paired with bcrypt password hashing. When users sign in, a cryptographically signed token is issued for authorized requests, and sensitive credentials are never stored in plaintext.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="section-pre-tag">HELP &amp; CLARITY</div>
          <h2 className="landing-section-title">Frequently Asked Questions</h2>
          <p className="landing-section-desc">
            Answers to common questions about features, architecture, and deployment.
          </p>
        </div>

        <div className="landing-faq-list" role="region" aria-label="FAQ Accordion">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const headingId = `faq-header-${idx}`;
            const panelId = `faq-panel-${idx}`;

            return (
              <div key={idx} className={`landing-faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  id={headingId}
                  className="landing-faq-question"
                  onClick={() => toggleAccordion(idx)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <span className="faq-question-text">{faq.question}</span>
                  <span className={`landing-faq-icon ${isOpen ? 'rotated' : ''}`} aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headingId}
                  className={`landing-faq-collapse ${isOpen ? 'expanded' : ''}`}
                >
                  <div className="landing-faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
