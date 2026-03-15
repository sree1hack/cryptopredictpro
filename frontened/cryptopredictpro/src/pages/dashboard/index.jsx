import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '../../components/ui/Header';
import CryptoSelector from './components/CryptoSelector';
import TimeframeSelector from './components/TimeframeSelector';
import PredictionControls from './components/PredictionControls';
import PredictionChart from './components/PredictionChart';
import PredictionSummary from './components/PredictionSummary';
import DashboardStats from './components/DashboardStats';
import TradingPanel from './components/TradingPanel';
import Icon from '../../components/AppIcon';
import { formatINRPrice, getAllCoinsLivePrices, getLivePrediction, getUserStats } from '../../services/predictionApi';

const sectionAnim = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeMode, setActiveMode] = useState('prediction');
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('');
  const [loading, setLoading] = useState(false);
  const [predictionData, setPredictionData] = useState([]);
  const [predictionSummary, setPredictionSummary] = useState(null);
  const [lastPrediction, setLastPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalPredictions: 0, accuracyRate: 0, history: [] });
  const [livePrices, setLivePrices] = useState({});
  const [livePriceTimestamp, setLivePriceTimestamp] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('cryptoUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchStats = async () => {
    if (!user?.id) return;
    const data = await getUserStats(user.id);
    if (data.success) setStats(data);
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const refreshLivePrices = async () => {
    const response = await getAllCoinsLivePrices();
    if (!response?.success) return;
    setLivePrices(response.prices || {});
    setLivePriceTimestamp(response.timestamp || new Date().toISOString());
  };

  useEffect(() => {
    refreshLivePrices();
    const timer = setInterval(refreshLivePrices, 60000);
    return () => clearInterval(timer);
  }, []);

  const handlePredict = async () => {
    if (!selectedCrypto || !selectedTimeframe) {
      setError('Select both cryptocurrency and timeframe before running prediction.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getLivePrediction(selectedCrypto, selectedTimeframe);
      if (!response?.success) {
        setError(response?.error || 'Failed to generate prediction');
        return;
      }

      setPredictionData(response?.chartData || []);
      setPredictionSummary(response?.summary);
      setLastPrediction({
        crypto: selectedCrypto,
        timeframe: selectedTimeframe,
        timestamp: response?.prediction?.timestamp,
        currentPrice: response?.prediction?.currentPrice,
        predictedPrice: response?.prediction?.predictedPrice,
        confidence: response?.prediction?.confidence
      });
      fetchStats();
    } catch (err) {
      setError(err?.message || 'Prediction request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cryptoUser');
    localStorage.removeItem('authToken');
    setUser(null);
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neo-card p-8 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Icon name="User" size={24} color="var(--color-primary)" />
          </div>
          <p className="text-muted-foreground">Loading secure workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <Header user={user} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 grid-background opacity-50 pointer-events-none" />
          <div className="absolute -left-20 top-28 h-64 w-64 rounded-full bg-primary/20 blur-[88px] floating-orb pointer-events-none" />
          <div className="absolute -right-20 top-44 h-64 w-64 rounded-full bg-accent/20 blur-[94px] floating-orb pointer-events-none" />

          <div className="container mx-auto px-4 py-8 relative z-10">
            <motion.div {...sectionAnim} className="glass-panel rounded-3xl p-6 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Control Center</p>
                  <h1 className="text-3xl lg:text-4xl font-display font-bold text-gradient">
                    Market Intelligence Workspace
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Hello {user?.name || user?.email}. Run AI forecasts or execute live trades from one production dashboard.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 border border-border/70">
                    <Icon name="Calendar" size={14} className="mr-2" />
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center text-xs text-success bg-success/10 rounded-xl px-3 py-2 border border-success/20">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse mr-2" />
                    Live Backend Connected
                  </div>
                </div>
              </div>
            </motion.div>

            <DashboardStats
              user={user}
              totalPredictions={stats.totalPredictions}
              accuracyRate={stats.accuracyRate}
              lastActivity={
                stats.history.length > 0
                  ? `Last: ${stats.history[0].coin} (${new Date(stats.history[0].timestamp).toLocaleTimeString()})`
                  : 'No predictions yet'
              }
            />

            <motion.div {...sectionAnim} transition={{ ...sectionAnim.transition, delay: 0.08 }} className="flex gap-3 mb-6">
              <button
                onClick={() => setActiveMode('prediction')}
                className={`px-5 py-3 rounded-xl text-sm font-semibold transition-smooth border ${
                  activeMode === 'prediction'
                    ? 'bg-primary/20 border-primary/40 text-foreground soft-glow'
                    : 'bg-muted/60 border-border/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                Prediction Dashboard
              </button>
              <button
                onClick={() => setActiveMode('trading')}
                className={`px-5 py-3 rounded-xl text-sm font-semibold transition-smooth border ${
                  activeMode === 'trading'
                    ? 'bg-accent/20 border-accent/40 text-foreground soft-glow'
                    : 'bg-muted/60 border-border/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                Live Trading Desk
              </button>
            </motion.div>

            {error && (
              <motion.div {...sectionAnim} className="mb-6 p-4 bg-error/10 border border-error/30 rounded-xl text-error flex items-center">
                <Icon name="AlertCircle" size={18} className="mr-2" />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}

            <motion.div {...sectionAnim} transition={{ ...sectionAnim.transition, delay: 0.06 }} className="mb-6 neo-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live Coin Tape (INR)</p>
                <button
                  onClick={refreshLivePrices}
                  className="text-xs text-primary hover:text-primary/80 transition-smooth"
                >
                  Refresh Now
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {['BTC', 'ETH', 'DOGE', 'LTC', 'DOT', 'MATIC', 'XRP', 'LINK', 'BCH', 'BNB', 'SOL', 'ADA', 'AVAX'].map((coin) => (
                  <div key={coin} className="rounded-xl border border-border/70 bg-input/40 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{coin}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {livePrices?.[coin]?.inr ? formatINRPrice(livePrices[coin].inr) : '--'}
                    </p>
                  </div>
                ))}
              </div>
              {livePriceTimestamp && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Last update: {new Date(livePriceTimestamp).toLocaleTimeString()}
                </p>
              )}
            </motion.div>

            <AnimatePresence mode="wait">
              {activeMode === 'prediction' ? (
                <motion.section
                  key="prediction-view"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {lastPrediction && !loading && (
                    <div className="mb-6 p-4 rounded-xl border border-success/30 bg-success/10 flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon name="CheckCircle" size={18} className="mr-2 text-success" />
                        <div className="text-sm">
                          <span className="font-semibold text-foreground">Latest Output:</span>{' '}
                          <span className="text-muted-foreground">{lastPrediction?.crypto}</span>{' '}
                          <span className="text-foreground">
                            {formatINRPrice(lastPrediction?.currentPrice)} to {formatINRPrice(lastPrediction?.predictedPrice)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(lastPrediction?.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-4 space-y-6">
                      <CryptoSelector
                        selectedCrypto={selectedCrypto}
                        onCryptoChange={setSelectedCrypto}
                        loading={loading}
                        livePrices={livePrices}
                      />
                      <TimeframeSelector
                        selectedTimeframe={selectedTimeframe}
                        onTimeframeChange={setSelectedTimeframe}
                        loading={loading}
                      />
                      <PredictionControls
                        selectedCrypto={selectedCrypto}
                        selectedTimeframe={selectedTimeframe}
                        onPredict={handlePredict}
                        loading={loading}
                        lastPrediction={lastPrediction}
                      />
                    </div>

                    <div className="xl:col-span-8 space-y-6">
                      <PredictionChart predictionData={predictionData} loading={loading} selectedCrypto={selectedCrypto} />
                      <PredictionSummary
                        predictionSummary={predictionSummary}
                        loading={loading}
                        selectedCrypto={selectedCrypto}
                        selectedTimeframe={selectedTimeframe}
                      />
                    </div>
                  </div>
                </motion.section>
              ) : (
                <motion.section
                  key="trading-view"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-6"
                >
                  <div className="glass-panel rounded-2xl p-4 border border-border/60">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Execution Layer</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet credentials, review quote + guardrails, then execute paper/live orders.
                    </p>
                  </div>
                  <TradingPanel user={user} />
                </motion.section>
              )}
            </AnimatePresence>

            <motion.div {...sectionAnim} transition={{ ...sectionAnim.transition, delay: 0.1 }} className="mt-10 neo-card overflow-hidden">
              <div className="p-5 border-b border-border/70 flex items-center justify-between bg-muted/20">
                <h3 className="text-lg font-display font-semibold text-foreground">Prediction History</h3>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Icon name="History" size={14} className="mr-2" />
                  Last 10 sessions
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-[0.12em]">
                      <th className="px-6 py-4 font-semibold">Asset</th>
                      <th className="px-6 py-4 font-semibold">Timeframe</th>
                      <th className="px-6 py-4 font-semibold">Entry</th>
                      <th className="px-6 py-4 font-semibold">Prediction</th>
                      <th className="px-6 py-4 font-semibold">Confidence</th>
                      <th className="px-6 py-4 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {stats.history.length > 0 ? (
                      stats.history.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-smooth text-sm">
                          <td className="px-6 py-4 font-semibold text-foreground">{item.coin}</td>
                          <td className="px-6 py-4 capitalize text-muted-foreground">{item.timeframe}</td>
                          <td className="px-6 py-4">{formatINRPrice(item.current_price)}</td>
                          <td className="px-6 py-4 font-semibold text-primary">{formatINRPrice(item.predicted_price)}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-primary/10 border border-primary/25 text-primary text-xs rounded-lg font-medium">
                              {item.confidence}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground italic">
                          No prediction history yet. Run your first forecast.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
