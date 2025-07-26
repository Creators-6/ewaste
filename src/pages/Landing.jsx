import React, { useEffect, useState } from 'react';

const PRIMARY = '#2E7D32'; // Eco Green
const PRIMARY_LIGHT = '#66BB6A';
const BG = '#E8F5E9';
const TEXT = '#212121';
const SUBTEXT = '#555';

const Landing = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        background: BG,
        color: TEXT,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          padding: '20px 60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'transparent',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: PRIMARY }}>
          ♻ E-Waste Recycle
        </div>
        <div style={{ display: 'flex', gap: 30, fontSize: 15, fontWeight: 500 }}>
          <a
            href="/signup"
            aria-label="Sign up for e-waste recycling"
            style={{
              padding: '10px 20px',
              background: PRIMARY,
              color: '#fff',
              borderRadius: 20,
              textDecoration: 'none',
              fontWeight: 600,
              transition: '0.3s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = PRIMARY_LIGHT)}
            onMouseOut={e => (e.currentTarget.style.background = PRIMARY)}
          >
            Sign Up
          </a>
          <a
            href="/login"
            aria-label="Login to your e-waste recycling account"
            style={{
              padding: '10px 20px',
              background: PRIMARY,
              color: '#fff',
              borderRadius: 20,
              textDecoration: 'none',
              fontWeight: 600,
              transition: '0.3s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = PRIMARY_LIGHT)}
            onMouseOut={e => (e.currentTarget.style.background = PRIMARY)}
          >
            Login
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '40px 20px' : '60px 100px',
          flexWrap: 'wrap',
          gap: 30,
        }}
      >
        {/* Text Section */}
        <div style={{ maxWidth: 550 }}>
          <h1 style={{ fontSize: isMobile ? 32 : 42, fontWeight: 800, lineHeight: 1.2 }}>
            Build a Greener Future<br />by Recycling E-Waste
          </h1>
          <p
            style={{
              fontSize: 18,
              color: SUBTEXT,
              marginTop: 20,
              lineHeight: 1.6,
            }}
          >
            “The greatest threat to our planet is the belief that someone else will save it.”
            <br />
            Join us and make a difference — recycle your electronics responsibly.
          </p>
          <div style={{ display: 'flex', gap: 20, marginTop: 30, flexWrap: 'wrap' }}>
            <a
              href="/signup"
              aria-label="Start your recycling journey"
              style={{
                padding: '14px 32px',
                background: PRIMARY,
                color: '#fff',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: 'none',
                transition: '0.3s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = PRIMARY_LIGHT)}
              onMouseOut={e => (e.currentTarget.style.background = PRIMARY)}
            >
              Get Started
            </a>
            <a
              href="#learn"
              aria-label="Learn more about e-waste recycling"
              style={{
                padding: '14px 32px',
                background: 'transparent',
                border: `2px solid ${PRIMARY}`,
                color: PRIMARY,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: 'none',
                transition: '0.3s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = PRIMARY;
                e.currentTarget.style.color = '#fff';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = PRIMARY;
              }}
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Illustration Section */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <img
            src="https://i.postimg.cc/T2m6891P/bg1ewaste.png"
            alt="E-Waste Illustration"
            style={{ maxWidth: '100%', height: 'auto', width: 400 }}
          />
        </div>
      </div>

      {/* Learn Section */}
      <div id="learn" style={{ background: '#F1F8E9', padding: isMobile ? '50px 20px' : '80px 100px' }}>
        <h2 style={{ color: PRIMARY, fontSize: 30, fontWeight: 800, textAlign: 'center', marginBottom: 50 }}>
          Why Recycle E-Waste?
        </h2>
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            borderRadius: 20,
            padding: isMobile ? 20 : 40,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            gap: 40,
          }}
        >
          {/* Text */}
          <div style={{ flex: 1 }}>
            <h3 style={{ color: PRIMARY, fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
              E-Waste is Valuable — and Dangerous
            </h3>
            <p style={{ fontSize: 17, color: SUBTEXT, lineHeight: 1.6 }}>
              E-waste includes precious metals like gold and copper that can be recovered and reused.
              However, it also contains toxic substances like lead and mercury that are harmful to our
              health and the environment if not properly handled.
            </p>
            <p style={{ fontSize: 17, color: SUBTEXT, marginTop: 16, lineHeight: 1.6 }}>
              By recycling responsibly, you reduce pollution, conserve natural resources, and promote a
              sustainable future for everyone.
            </p>
          </div>

          {/* Image */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <img
              src="https://pirg.org/edfund/wp-content/uploads/2022/07/shutterstock_1675847923-1024x576.jpg"
              alt="Recycle e-waste"
              style={{
                width: '100%',
                maxWidth: 400,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              }}
            />
          </div>
        </div>
      </div>

      {/* What Can Be Recycled */}
      <div style={{ background: '#fff', padding: isMobile ? '40px 20px' : '60px 100px', textAlign: 'center' }}>
        <h2 style={{ color: PRIMARY, fontSize: 28, fontWeight: 800, marginBottom: 36 }}>
          What You Can Recycle
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, justifyContent: 'center' }}>
          {[
            { name: 'Mobile Phones', emoji: '📱' },
            { name: 'Laptops', emoji: '💻' },
            { name: 'Batteries', emoji: '🔋' },
            { name: 'Monitors', emoji: '🖥' },
            { name: 'Wires & Cables', emoji: '🔌' },
            { name: 'Printers', emoji: '🖨' },
          ].map(item => (
            <div key={item.name} style={{ width: 120, padding: 10, background: '#F9FBE7', borderRadius: 12 }}>
              <div style={{ fontSize: 32 }}>{item.emoji}</div>
              <div style={{ fontSize: 14, marginTop: 8, fontWeight: 500 }}>{item.name}</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, fontSize: 16, color: '#777' }}>
          ...and much more!
        </p>
      </div>

      {/* How It Works */}
      <div style={{ background: '#E0F2F1', padding: isMobile ? '50px 20px' : '80px 100px' }}>
        <h2 style={{ color: PRIMARY, fontSize: 30, fontWeight: 800, textAlign: 'center', marginBottom: 50 }}>
          How It Works
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 30,
            textAlign: 'center',
          }}
        >
          {[
            {
              emoji: '📚',
              title: 'Learn About E-Waste',
              desc: 'Understand the impact of electronic waste and how it affects our planet. Knowledge is the first step to change.',
            },
            {
              emoji: '♻',
              title: 'Recycle Responsibly',
              desc: 'Choose what you want to recycle and drop it off or schedule a pickup. We ensure safe and certified disposal.',
            },
            {
              emoji: '🌟',
              title: 'Earn Eco Points',
              desc: 'Get rewarded with eco-points, certificates, or recognition for every item you recycle. Do good and feel proud!',
            },
          ].map(step => (
            <div
              key={step.title}
              style={{
                background: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: 38 }}>{step.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>{step.title}</div>
              <div style={{ fontSize: 14, color: SUBTEXT, marginTop: 8, lineHeight: 1.6 }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div style={{ background: '#fff', padding: isMobile ? '40px 20px' : '60px 100px' }}>
        <h2 style={{ color: PRIMARY, fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 36 }}>
          Hear from Our Community
        </h2>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 30, justifyContent: 'center' }}>
          {[
            {
              name: 'Ananya R.',
              msg: 'This platform made recycling so easy! I even got rewarded for it.',
            },
            {
              name: 'Rahul M.',
              msg: 'It feels good to know my old laptop didn’t end up in a landfill.',
            },
          ].map(t => (
            <div key={t.name} style={{ flex: 1, background: '#F1F8E9', padding: 20, borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
              <p style={{ fontSize: 15, fontStyle: 'italic' }}>"{t.msg}"</p>
              <p style={{ fontWeight: 600, marginTop: 12 }}>— {t.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          background: PRIMARY,
          color: '#fff',
          fontSize: 14,
          padding: '20px 0',
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        &copy; {new Date().getFullYear()} E-Waste Recycle. All rights reserved. | 📧 contact@ewasterecycle.com
      </footer>
    </div>
  );
};

export default Landing;
