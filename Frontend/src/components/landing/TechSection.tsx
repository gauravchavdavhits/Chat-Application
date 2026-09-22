import React from 'react';

interface TechItem {
  badge: string;
  name: string;
  description: string;
  specs: string[];
}

const TECHNOLOGIES: TechItem[] = [
  {
    badge: 'Frontend',
    name: 'React 18 & TypeScript',
    description: 'Component architecture bundled with Vite for rapid HMR, strict type safety, and optimized responsive layouts.',
    specs: ['Strict TypeScript', 'Vite Bundler', 'CSS Custom Tokens'],
  },
  {
    badge: 'Real-Time',
    name: 'Socket.IO & WebSockets',
    description: 'Persistent bidirectional event engine providing immediate message broadcasting, typing states, and presence synchronization.',
    specs: ['Sub-20ms Event Flow', 'Automatic Reconnection', 'Room Namespaces'],
  },
  {
    badge: 'Backend',
    name: 'Node.js & Express.js',
    description: 'RESTful API gateway managing authentication middleware, rate limits, user management, and file upload services.',
    specs: ['Stateless API Endpoints', 'CORS Safeguards', 'Modular Controllers'],
  },
  {
    badge: 'Database',
    name: 'MongoDB Atlas & Mongoose',
    description: 'High-availability document database storing structured user profiles, encrypted credentials, conversation threads, and call history.',
    specs: ['Cloud Managed', 'Schema Indexing', 'Optimized Queries'],
  },
];

export const TechSection: React.FC = () => {
  return (
    <section id="technology" className="landing-section landing-tech-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="section-pre-tag">ARCHITECTURE</div>
          <h2 className="landing-section-title">Engineered with Production Technologies</h2>
          <p className="landing-section-desc">
            A battle-tested full-stack web stack delivering speed, security, and developer clarity.
          </p>
        </div>

        <div className="landing-tech-grid">
          {TECHNOLOGIES.map((tech, idx) => (
            <article key={idx} className="landing-tech-card">
              <div className="landing-tech-tag">{tech.badge}</div>
              <h3 className="landing-tech-name">{tech.name}</h3>
              <p className="landing-tech-desc">{tech.description}</p>
              <div className="landing-tech-specs">
                {tech.specs.map((spec, sIdx) => (
                  <span key={sIdx} className="tech-spec-pill">
                    {spec}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
