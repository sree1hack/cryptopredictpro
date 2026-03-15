import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import {
  getTradeConfig,
  getTradeHistory,
  getTradeQuote,
  getWalletBalances,
  placeLiveTrade,
  placePaperTrade
} from '../../../services/predictionApi';

const TradingPanel = ({ user }) => {
  const [walletPlatform, setWalletPlatform] = useState('binance');
  const [mode, setMode] = useState('paper');
  const [exchangeMode, setExchangeMode] = useState('live');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [quantity, setQuantity] = useState('0.01');
  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [liveEnabled, setLiveEnabled] = useState(false);
  const [testnetEnabled, setTestnetEnabled] = useState(false);
  const [maxOrderNotional, setMaxOrderNotional] = useState(250);
  const [maxDailyNotional, setMaxDailyNotional] = useState(1000);

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [balances, setBalances] = useState([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSide, setPendingSide] = useState('buy');
  const [confirmText, setConfirmText] = useState('');

  const estimatedNotional = useMemo(() => {
    const px = Number(quote?.price || 0);
    const qty = Number(quantity || 0);
    if (!px || !qty) return 0;
    return px * qty;
  }, [quote?.price, quantity]);

  const platformSupportsLive = walletPlatform === 'binance';
  const canUseCurrentExchange = platformSupportsLive && (exchangeMode === 'testnet' ? testnetEnabled : liveEnabled);

  const loadQuote = async () => {
    setError('');
    const result = await getTradeQuote(symbol.toUpperCase(), mode === 'live' ? exchangeMode : 'live');
    if (result.success) setQuote(result);
    else setError(result.error);
  };

  const loadHistory = async () => {
    if (!user?.id) return;
    const result = await getTradeHistory(user.id);
    if (result.success) setHistory(result.history || []);
  };

  const loadConfig = async () => {
    const config = await getTradeConfig();
    if (!config.success) return;
    setLiveEnabled(!!config.liveTradingEnabled);
    setTestnetEnabled(!!config.testnetTradingEnabled);
    if (typeof config.maxOrderNotionalUsdt === 'number') setMaxOrderNotional(config.maxOrderNotionalUsdt);
    if (typeof config.maxDailyNotionalUsdt === 'number') setMaxDailyNotional(config.maxDailyNotionalUsdt);
  };

  useEffect(() => {
    loadConfig();
    loadHistory();
  }, [user?.id]);

  useEffect(() => {
    loadQuote();
  }, [symbol, mode, exchangeMode]);

  const fetchBalances = async () => {
    setError('');
    setMessage('');
    if (!apiKey || !apiSecret) {
      setError('Enter Binance API key and secret first.');
      return;
    }
    if (!platformSupportsLive) {
      setError(`${walletPlatform} connector is coming soon. Use Binance for live trading right now.`);
      return;
    }
    if (!canUseCurrentExchange) {
      setError(`${exchangeMode} trading is disabled on server.`);
      return;
    }
    setLoading(true);
    const result = await getWalletBalances({ apiKey, apiSecret, exchangeMode });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setBalances(result.balances || []);
    setMessage(`Wallet balances loaded from ${exchangeMode}.`);
  };

  const executeTrade = async (side, confirmLive = false) => {
    setLoading(true);
    setError('');
    setMessage('');
    const qty = Number(quantity);
    const normalizedSymbol = symbol.toUpperCase();

    let result;
    if (mode === 'live') {
      if (!canUseCurrentExchange) {
        setLoading(false);
        setError(`${walletPlatform} ${exchangeMode} trading is disabled on server.`);
        return;
      }
      if (!apiKey || !apiSecret) {
        setLoading(false);
        setError('API key and secret are required for live trading.');
        return;
      }
      if (!confirmLive) {
        setLoading(false);
        setPendingSide(side);
        setConfirmText('');
        setConfirmOpen(true);
        return;
      }
      result = await placeLiveTrade({
        userId: user?.id,
        symbol: normalizedSymbol,
        side,
        quantity: qty,
        apiKey,
        apiSecret,
        exchangeMode
      });
    } else {
      result = await placePaperTrade({
        userId: user?.id,
        symbol: normalizedSymbol,
        side,
        quantity: qty
      });
    }

    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    const prefix = mode === 'live' ? exchangeMode.toUpperCase() : 'PAPER';
    setMessage(`${prefix} ${side.toUpperCase()} executed at ${Number(result.trade.executed_price).toFixed(4)} USDT`);
    setConfirmOpen(false);
    loadHistory();
    loadQuote();
  };

  return (
    <div className="neo-card hud-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center mr-3 soft-glow">
            <Icon name="Wallet" size={20} color="var(--color-accent)" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Wallet & Trading</h3>
            <p className="text-sm text-muted-foreground">Paper and real-time Binance trading with safety checks.</p>
          </div>
        </div>
        <button onClick={loadQuote} className="text-xs text-primary hover:text-primary/80">
          Refresh Quote
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setMode('paper')}
          className={`rounded-xl py-2 text-sm font-medium transition-smooth ${mode === 'paper' ? 'bg-primary/20 text-foreground soft-glow' : 'bg-muted/70 text-muted-foreground hover:text-foreground'}`}
        >
          Paper Mode
        </button>
        <button
          onClick={() => setMode('live')}
          className={`rounded-xl py-2 text-sm font-medium transition-smooth ${mode === 'live' ? 'bg-error/20 text-foreground soft-glow' : 'bg-muted/70 text-muted-foreground hover:text-foreground'}`}
        >
          Live Mode
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {['binance', 'coinbase', 'kraken'].map((platform) => (
          <button
            key={platform}
            onClick={() => setWalletPlatform(platform)}
            className={`rounded-xl py-2 text-xs font-semibold uppercase tracking-wide transition-smooth ${
              walletPlatform === platform
                ? 'bg-secondary/80 text-secondary-foreground border border-border/70'
                : 'bg-muted/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            {platform}
          </button>
        ))}
      </div>

      {mode === 'live' && (
        <div className="space-y-3 mb-4">
          {!platformSupportsLive && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              {walletPlatform.toUpperCase()} connector UI is ready, backend execution is currently supported for BINANCE only.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExchangeMode('live')}
              className={`rounded-xl py-2 text-sm font-medium transition-smooth ${exchangeMode === 'live' ? 'bg-warning/30 text-foreground' : 'bg-muted/70 text-muted-foreground hover:text-foreground'}`}
            >
              Binance Live
            </button>
            <button
              onClick={() => setExchangeMode('testnet')}
              className={`rounded-xl py-2 text-sm font-medium transition-smooth ${exchangeMode === 'testnet' ? 'bg-secondary text-secondary-foreground' : 'bg-muted/70 text-muted-foreground hover:text-foreground'}`}
            >
              Binance Testnet
            </button>
          </div>

          <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            {exchangeMode.toUpperCase()} mode uses market orders. Estimated notional: {estimatedNotional.toFixed(2)} USDT.
          </div>
          <div className="text-xs text-muted-foreground">
            Guardrails: max/order {maxOrderNotional} USDT, daily/user {maxDailyNotional} USDT.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="rounded-xl bg-input/80 border border-border/80 px-3 py-2 text-sm"
          placeholder="BTCUSDT"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="rounded-xl bg-input/80 border border-border/80 px-3 py-2 text-sm"
          placeholder="Quantity"
          type="number"
          step="0.0001"
          min="0"
        />
        <div className="rounded-xl border border-border/80 px-3 py-2 text-sm bg-muted/40">
          {quote?.success ? `Live: ${Number(quote.price).toFixed(4)} USDT` : 'Live quote unavailable'}
        </div>
      </div>

      {mode === 'live' && (
        <div className="space-y-3 mb-4">
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-xl bg-input/80 border border-border/80 px-3 py-2 text-sm"
            placeholder={`Binance ${exchangeMode} API Key`}
          />
          <div className="flex gap-2">
            <input
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              type={showSecret ? 'text' : 'password'}
              className="flex-1 rounded-xl bg-input/80 border border-border/80 px-3 py-2 text-sm"
              placeholder={`Binance ${exchangeMode} API Secret`}
            />
            <Button variant="outline" onClick={() => setShowSecret((s) => !s)}>
              {showSecret ? 'Hide' : 'Show'}
            </Button>
          </div>
          <Button variant="outline" onClick={fetchBalances} loading={loading}>
            Load Wallet Balances
          </Button>
          {balances.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                Connected wallet balances ({exchangeMode})
              </div>
              <div className="max-h-32 overflow-auto">
                {balances.map((b) => (
                  <div key={b.asset} className="px-3 py-2 border-t border-border text-sm flex items-center justify-between">
                    <span>{b.asset}</span>
                    <span className="text-muted-foreground">free: {b.free} / locked: {b.locked}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <Button onClick={() => executeTrade('buy')} loading={loading} className="flex-1">
          {mode === 'live' ? `${exchangeMode === 'testnet' ? 'Testnet' : 'Live'} Buy` : 'Paper Buy'}
        </Button>
        <Button variant="outline" onClick={() => executeTrade('sell')} loading={loading} className="flex-1">
          {mode === 'live' ? `${exchangeMode === 'testnet' ? 'Testnet' : 'Live'} Sell` : 'Paper Sell'}
        </Button>
      </div>

      {message && <p className="text-sm text-success mb-2">{message}</p>}
      {error && <p className="text-sm text-error mb-2">{error}</p>}

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">Recent trades</div>
        <div className="max-h-48 overflow-auto">
          {history.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">No trades yet.</div>
          )}
          {history.map((trade) => (
            <div key={trade.id} className="px-3 py-2 border-t border-border text-sm flex items-center justify-between">
              <span className="font-medium">{String(trade.mode).toUpperCase()} {String(trade.side).toUpperCase()} {trade.symbol}</span>
              <span className="text-muted-foreground">{Number(trade.quantity).toFixed(4)} @ {Number(trade.executed_price).toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-modal">
            <h4 className="text-lg font-semibold text-foreground mb-2">Confirm Live Order</h4>
            <p className="text-sm text-muted-foreground mb-4">
              You are about to place a real {exchangeMode} market order.
            </p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span>Side</span><span className="font-medium">{pendingSide.toUpperCase()}</span></div>
              <div className="flex justify-between"><span>Symbol</span><span className="font-medium">{symbol.toUpperCase()}</span></div>
              <div className="flex justify-between"><span>Quantity</span><span className="font-medium">{quantity}</span></div>
              <div className="flex justify-between"><span>Est. Notional</span><span className="font-medium">{estimatedNotional.toFixed(2)} USDT</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1">
                Type <span className="font-semibold text-foreground">CONFIRM</span> to proceed
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-xl bg-input/80 border border-border/80 px-3 py-2 text-sm"
                placeholder="CONFIRM"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={confirmText !== 'CONFIRM'}
                onClick={() => executeTrade(pendingSide, true)}
              >
                Confirm Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPanel;
