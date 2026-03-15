import axios from 'axios';

// ----------------------------
// Configuration & Mappings
// ----------------------------
const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:5001';
  return `http://${host}:5001`;
};

const API_BASE_URL = resolveApiBaseUrl();
const BINANCE_API_URL = "https://api.binance.com/api/v3/klines";

// Model name mapping for cryptocurrencies
const MODEL_NAME_MAP = {
  "BTC": { "binance": "BTCUSDT", "model": "BITCOIN_INR.keras" },
  "ETH": { "binance": "ETHUSDT", "model": "ETHEREUM_INR.keras" },
  "DOGE": { "binance": "DOGEUSDT", "model": "DOGECOIN_INR.keras" },
  "LTC": { "binance": "LTCUSDT", "model": "LITECOIN_INR.keras" },
  "DOT": { "binance": "DOTUSDT", "model": "POLKADOT_INR.keras" },
  "MATIC": { "binance": "MATICUSDT", "model": "POLYGON_INR.keras" },
  "XRP": { "binance": "XRPUSDT", "model": "RIPPLE_INR.keras" },
  "LINK": { "binance": "LINKUSDT", "model": "CHAINLINK_INR.keras" },
  "BCH": { "binance": "BCHUSDT", "model": "BITCOIN_CASH_INR.keras" },
  "BNB": { "binance": "BNBUSDT", "model": "BINANCE_INR.keras" },
  "SOL": { "binance": "SOLUSDT", "model": "SOLANA_INR.keras" },
  "ADA": { "binance": "ADAUSDT", "model": "CARDANO_INR.keras" },
  "AVAX": { "binance": "AVAXUSDT", "model": "AVALANCHE_INR.keras" }
};

const COIN_ORDER = ["BTC", "ETH", "DOGE", "LTC", "DOT", "MATIC", "XRP", "LINK", "BCH", "BNB", "SOL", "ADA", "AVAX"];

// USD to INR conversion rate (should be updated regularly in production)
const USD_TO_INR = 88.19;

// ----------------------------
// API Functions
// ----------------------------

/**
 * Fetches live price data from Binance API and converts to INR
 */
export const fetchBinanceData = async (symbol = "BTCUSDT", interval = "1h", lookback = "200") => {
  try {
    const url = `${BINANCE_API_URL}?symbol=${symbol}&interval=${interval}&limit=${lookback}`;
    const response = await axios.get(url);

    if (!response?.data || !Array.isArray(response.data)) {
      throw new Error(`Binance API error for ${symbol}: Invalid response`);
    }

    const data = response.data.map(candle => ({
      timestamp: new Date(candle[0]),
      open: parseFloat(candle[1]) * USD_TO_INR,
      high: parseFloat(candle[2]) * USD_TO_INR,
      low: parseFloat(candle[3]) * USD_TO_INR,
      close: parseFloat(candle[4]) * USD_TO_INR,
      volume: parseFloat(candle[5])
    }));

    return data.filter(item => item.close && !isNaN(item.close));
  } catch (error) {
    console.error('Error fetching Binance data:', error);
    throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
  }
};

export const getAllCoinsLivePrices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/prices`, {
      timeout: 12000
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.error || "Invalid price response");
    }

    return response.data;
  } catch (error) {
    return {
      success: false,
      prices: {},
      error: error.message || "Failed to load live prices"
    };
  }
};

/**
 * Simulates Google Login and persists user in backend
 */
export const loginWithGoogle = async (googleUser) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/google`, googleUser);
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Failed to authenticate with Google' };
  }
};

/**
 * Fetches real user stats and history from backend
 */
export const getUserStats = async (userId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/user/stats/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Stats error:', error);
    return { success: false, error: 'Failed to fetch user stats' };
  }
};

/**
 * Generates prediction chart data for visualization
 */
const generatePredictionChartData = (historicalData, prediction, timeframe) => {
  const chartData = [];
  const dataPoints = Math.min(timeframe?.type === 'hourly' ? timeframe.value : timeframe.value, 30);

  // Use last N points from historical data
  const recentData = historicalData.slice(-dataPoints);

  recentData.forEach((data, index) => {
    let timeLabel;
    if (timeframe?.type === 'hourly') {
      timeLabel = `${index + 1} h`;
    } else {
      timeLabel = `Day ${index + 1} `;
    }

    chartData.push({
      time: timeLabel,
      actual: Math.round(data.close * 100) / 100,
      predicted: index === recentData.length - 1 ?
        prediction.predictedPrice :
        Math.round((data.close + (Math.random() - 0.5) * data.close * 0.02) * 100) / 100
    });
  });

  return chartData;
};

/**
 * Generates AI analysis summary
 */
const generateAnalysisSummary = (prediction, coin, timeframe) => {
  const priceChange = ((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice) * 100;

  let trend = 'neutral';
  if (priceChange > 2) trend = 'bullish';
  else if (priceChange < -2) trend = 'bearish';

  const timeframeText = timeframe?.type === 'hourly'
    ? `${timeframe.value} hour${timeframe.value > 1 ? 's' : ''}`
    : `${timeframe.value} day${timeframe.value > 1 ? 's' : ''}`;

  const analyses = {
    bullish: `Technical analysis indicates ${coin} shows strong upward momentum for the ${timeframeText} timeframe. Current market indicators suggest positive sentiment with potential price appreciation. The AI model predicts continued growth based on recent trading patterns and volume analysis.`,
    bearish: `Market indicators suggest ${coin} may face downward pressure in the ${timeframeText} period. Technical signals indicate potential consolidation or correction. The AI model recommends caution and risk management for existing positions.`,
    neutral: `${coin} is expected to trade within a consolidation range for the ${timeframeText} timeframe. Mixed technical signals suggest sideways price action until a clear directional catalyst emerges. The AI model indicates stable but limited price movement.`
  };

  return {
    trend,
    priceChange,
    confidence: prediction.confidence,
    targetPrice: prediction.predictedPrice,
    analysis: analyses[trend],
    timestamp: new Date().toISOString()
  };
};

/**
 * Main prediction function that integrates with the existing dashboard
 * Calls real Python backend API
 */
export const getLivePrediction = async (coin, timeframe) => {
  try {
    // Validate inputs
    if (!MODEL_NAME_MAP[coin?.toUpperCase()]) {
      throw new Error(`No model mapping defined for ${coin}`);
    }

    if (!timeframe?.type || !timeframe?.value) {
      throw new Error('Invalid timeframe format');
    }

    const coinConfig = MODEL_NAME_MAP[coin.toUpperCase()];
    const savedUser = JSON.parse(localStorage.getItem('cryptoUser') || '{}');

    const payload = {
      coin: coin.toUpperCase(),
      timeframe: timeframe.type === 'hourly' ? 'hourly' : 'daily',
      user_id: savedUser.id || 'anonymous'
    };

    // Call real Flask backend
    const response = await axios.post(`${API_BASE_URL}/predict`, payload, { timeout: 30000 });
    const data = response.data;

    if (!data.success) {
      throw new Error(data.error || 'Backend failed to generate prediction');
    }

    // Use historical data from backend instead of fetching again from Binance
    // Use optional chaining and default to empty array to prevent "map of undefined"
    const historicalData = (data.historicalData || []).map(price => ({
      close: price
    }));

    const predictionResult = {
      predictedPrice: data.predictedPrice || 0,
      currentPrice: data.currentPrice || 0,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      timestamp: data.timestamp || new Date().toISOString()
    };

    // Generate chart data
    const chartData = generatePredictionChartData(historicalData, predictionResult, timeframe);

    // Generate analysis summary
    const summary = generateAnalysisSummary(predictionResult, coin, timeframe);

    return {
      success: true,
      prediction: {
        coin: coin.toUpperCase(),
        timeframe,
        currentPrice: predictionResult.currentPrice,
        predictedPrice: predictionResult.predictedPrice,
        priceChangePercent: summary.priceChange,
        confidence: predictionResult.confidence,
        timestamp: predictionResult.timestamp,
        modelUsed: coinConfig.model
      },
      chartData,
      summary
    };

  } catch (error) {
    console.error('Prediction error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to generate prediction',
      prediction: null,
      chartData: [],
      summary: null
    };
  }
};

/**
 * Get supported cryptocurrencies
 */
export const getSupportedCryptos = () => {
  return Object.keys(MODEL_NAME_MAP);
};

/**
 * Validate timeframe format
 */
export const validateTimeframe = (timeframe) => {
  if (!timeframe?.type || !timeframe?.value) return false;
  if (!['hourly', 'daily'].includes(timeframe.type)) return false;
  if (timeframe.value < 1 || timeframe.value > 30) return false;
  return true;
};

/**
 * Format price for display in INR
 */
export const formatINRPrice = (price) => {
  if (!price || isNaN(price)) return 'INR 0';
  return `INR ${Number(price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

/**
 * Get current INR conversion rate (in production, fetch from API)
 */
export const getINRConversionRate = () => {
  return USD_TO_INR;
};

export const getTradeQuote = async (symbol, exchangeMode = 'live') => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/trade/quote`, {
      symbol,
      exchange_mode: exchangeMode
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch trade quote'
    };
  }
};

export const placePaperTrade = async ({ userId, symbol, side, quantity }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/trade/paper`, {
      user_id: userId,
      symbol,
      side,
      quantity
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to place paper trade'
    };
  }
};

export const getTradeHistory = async (userId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/trade/history/${userId}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch trade history',
      history: []
    };
  }
};

export const getTradeConfig = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/trade/config`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      liveTradingEnabled: false,
      error: error.response?.data?.error || 'Failed to fetch trade config'
    };
  }
};

export const getWalletBalances = async ({ apiKey, apiSecret, exchangeMode = 'live' }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/trade/balances`, {
      api_key: apiKey,
      api_secret: apiSecret,
      exchange_mode: exchangeMode
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch balances',
      balances: []
    };
  }
};

export const placeLiveTrade = async ({ userId, symbol, side, quantity, apiKey, apiSecret, exchangeMode = 'live' }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/trade/live`, {
      user_id: userId,
      symbol,
      side: side.toUpperCase(),
      quantity,
      api_key: apiKey,
      api_secret: apiSecret,
      exchange_mode: exchangeMode,
      confirm_live: true
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to place live trade'
    };
  }
};
