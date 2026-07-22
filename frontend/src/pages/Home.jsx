import { Link } from 'react-router-dom'
import './Home.css'

const services = [
  {
    number: '01',
    title: 'Pain management',
    description: 'Targeted treatment plans that address the source of pain and help you move comfortably again.',
  },
  {
    number: '02',
    title: 'Sports rehabilitation',
    description: 'Progressive recovery programs designed to rebuild strength, confidence, and performance.',
  },
  {
    number: '03',
    title: 'Post-surgery recovery',
    description: 'Guided rehabilitation that supports healing and safely restores your everyday movement.',
  },
]

function Home() {
  return (
    <main className="home-page">
      <header className="home-header">
        <Link className="home-brand" to="/" aria-label="PhysioCare Clinic home">
          <span className="home-brand__mark" aria-hidden="true">+</span>
          <span>PhysioCare</span>
        </Link>

        <nav className="home-nav" aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#approach">Our approach</a>
          <Link to="/signin">Sign in</Link>
          <Link className="home-button home-button--small" to="/register">Get started</Link>
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero__content">
          <p className="home-kicker"><span /> Personal care. Real progress.</p>
          <h1>Move with confidence.<br /><em>Live without limits.</em></h1>
          <p className="home-hero__description">
            Expert physiotherapy built around your goals. From your first assessment to your strongest day, we are with you at every step.
          </p>
          <div className="home-hero__actions">
            <Link className="home-button" to="/register">Start your recovery <span aria-hidden="true">→</span></Link>
            <a className="home-text-link" href="#services">Explore our services</a>
          </div>
          <div className="home-trust" aria-label="Clinic highlights">
            <div><strong>1:1</strong><span>Personalized care</span></div>
            <div><strong>10+</strong><span>Years of experience</span></div>
            <div><strong>95%</strong><span>Patient satisfaction</span></div>
          </div>
        </div>

        <div className="home-hero__visual" aria-label="Your recovery plan preview">
          <div className="home-visual__glow" />
          <div className="home-visual__card home-visual__card--main">
            <div className="home-visual__header">
              <span>Your recovery</span>
              <span className="home-status"><i /> On track</span>
            </div>
            <div className="home-progress">
              <div className="home-progress__ring"><strong>72%</strong><span>complete</span></div>
              <div className="home-progress__copy">
                <span>Current focus</span>
                <strong>Mobility & strength</strong>
                <p>You are making excellent progress.</p>
              </div>
            </div>
            <div className="home-week">
              {['M', 'T', 'W', 'T', 'F'].map((day, index) => (
                <div className={index < 4 ? 'is-complete' : ''} key={`${day}-${index}`}>
                  <span>{day}</span><i>{index < 4 ? '✓' : '5'}</i>
                </div>
              ))}
            </div>
          </div>
          <div className="home-visual__card home-visual__card--appointment">
            <span className="home-appointment__icon" aria-hidden="true">+</span>
            <div><small>Next appointment</small><strong>Tuesday, 10:30 AM</strong></div>
          </div>
          <div className="home-visual__badge"><strong>4.9</strong><span>★★★★★</span><small>Patient rating</small></div>
        </div>
      </section>

      <section className="home-services" id="services">
        <div className="home-section-heading">
          <div><p className="home-kicker"><span /> What we treat</p><h2>Care that gets you<br />back to doing what you love.</h2></div>
          <p>Every treatment starts with listening. We understand your body, lifestyle, and goals before building a plan that is entirely yours.</p>
        </div>
        <div className="home-service-grid">
          {services.map((service) => (
            <article className="home-service-card" key={service.number}>
              <span>{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <Link to="/register" aria-label={`Get started with ${service.title}`}>Get started <span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-approach" id="approach">
        <div className="home-approach__statement">
          <p className="home-kicker home-kicker--light"><span /> Our approach</p>
          <h2>Recovery is not just about getting better. It is about coming back stronger.</h2>
        </div>
        <ol className="home-steps">
          <li><span>01</span><div><strong>Tell us your story</strong><p>We begin with a complete assessment of your movement, symptoms, and goals.</p></div></li>
          <li><span>02</span><div><strong>Build your plan</strong><p>Your physiotherapist creates a clear treatment path made specifically for you.</p></div></li>
          <li><span>03</span><div><strong>Make real progress</strong><p>Track each milestone and adapt your plan as your strength and confidence grow.</p></div></li>
        </ol>
      </section>

      <section className="home-cta">
        <p className="home-kicker"><span /> Ready when you are</p>
        <h2>Your next chapter starts with one small step.</h2>
        <p>Create your patient account and take the first step toward moving better.</p>
        <Link className="home-button" to="/register">Create your account <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="home-footer">
        <Link className="home-brand" to="/"><span className="home-brand__mark" aria-hidden="true">+</span><span>PhysioCare</span></Link>
        <p>Move better. Feel stronger. Live fully.</p>
        <span>© 2026 PhysioCare Clinic</span>
      </footer>
    </main>
  )
}

export default Home
