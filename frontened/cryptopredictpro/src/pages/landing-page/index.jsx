import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const rise = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
};

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('cryptoUser');
    if (savedUser) navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden">
      <div className="absolute inset-0 grid-background opacity-40 pointer-events-none" />
      <div className="absolute left-[-120px] top-20 h-72 w-72 bg-primary/20 rounded-full blur-[96px] floating-orb" />
      <div className="absolute right-[-120px] top-44 h-72 w-72 bg-accent/20 rounded-full blur-[96px] floating-orb" />

      <header className="relative z-20 border-b border-border/50 bg-card/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center soft-glow">
              <Icon name="TrendingUp" size={22} color="white" />
            </div>
            <span className="ml-3 text-xl font-display font-bold text-gradient">CryptoPredictPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
              Sign In
            </Link>
            <Link to="/sign-up">
              <Button size="sm">Launch Workspace</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          <motion.div {...rise} className="glass-panel rounded-3xl p-8 lg:p-12 hud-border">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-4">Future-Ready Trading Intelligence</p>
            <h1 className="text-4xl lg:text-6xl font-display font-bold leading-tight max-w-4xl">
              AI Forecasting + Live Execution in one <span className="text-gradient">futuristic control layer</span>
            </h1>
            <p className="mt-6 text-muted-foreground max-w-2xl">
              Predict crypto movement with LSTM-based models, monitor confidence in real time, and shift into live trading with guarded execution from the same dashboard.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/sign-up">
                <Button size="xl" iconName="Sparkles">
                  Start Predicting
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl" iconName="Wallet">
                  Open Trading Desk
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: 'Brain',
              title: 'Neural Forecast Engine',
              text: 'Per-coin hourly and daily models with refreshed metrics and predictions.'
            },
            {
              icon: 'ShieldCheck',
              title: 'Risk-Aware Live Trading',
              text: 'Built-in guardrails, configurable limits, and explicit confirmations for real orders.'
            },
            {
              icon: 'Activity',
              title: 'Operational Visibility',
              text: 'Unified prediction history, confidence tracking, and trade activity logs.'
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              {...rise}
              transition={{ ...rise.transition, delay: 0.12 + index * 0.08 }}
              className="neo-card hud-border p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center soft-glow">
                <Icon name={item.icon} size={20} color="var(--color-primary)" />
              </div>
              <h3 className="mt-4 text-xl font-display font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </motion.div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
