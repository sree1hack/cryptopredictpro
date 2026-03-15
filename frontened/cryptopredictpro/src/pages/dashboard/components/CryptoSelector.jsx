import React from 'react';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const CryptoSelector = ({ selectedCrypto, onCryptoChange, loading }) => {
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  
  const cryptoOptions = [
    { value: 'DOGE', label: 'Dogecoin (DOGE)' },
    { value: 'XRP', label: 'Ripple (XRP)' },
    { value: 'MATIC', label: 'Polygon (MATIC)' },
    { value: 'BTC', label: 'Bitcoin (BTC)' },
    { value: 'ETH', label: 'Ethereum (ETH)' },
    { value: 'LTC', label: 'Litecoin (LTC)' },
    { value: 'BCH', label: 'Bitcoin Cash (BCH)' },
    { value: 'BNB', label: 'Binance Coin (BNB)' },
    { value: 'DOT', label: 'Polkadot (DOT)' },
    { value: 'LINK', label: 'Chainlink (LINK)' },
    { value: 'SOL', label: 'Solana (SOL)' },
    { value: 'ADA', label: 'Cardano (ADA)' },
    { value: 'AVAX', label: 'Avalanche (AVAX)' }
  ];

  return (
    <div className={`neo-card hud-border p-6 transition-all duration-300 ${isSelectOpen ? 'z-[100] ring-1 ring-primary/30' : 'z-10'}`}>
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center mr-3 soft-glow">
          <Icon name="Coins" size={20} color="var(--color-primary)" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Select Cryptocurrency</h3>
          <p className="text-sm text-muted-foreground">Choose the crypto asset to predict</p>
        </div>
      </div>
      <Select
        label="Cryptocurrency"
        placeholder="Select a cryptocurrency"
        options={cryptoOptions}
        value={selectedCrypto}
        onChange={onCryptoChange}
        onOpenChange={setIsSelectOpen}
        disabled={loading}
        searchable
        className="w-full"
      />
      {selectedCrypto && (
        <div className="mt-4 p-3 bg-muted/70 rounded-xl border border-border/70">
          <div className="flex items-center">
            <Icon name="Info" size={16} color="var(--color-muted-foreground)" className="mr-2" />
            <span className="text-sm text-muted-foreground">
              Selected: {selectedCrypto}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CryptoSelector;
