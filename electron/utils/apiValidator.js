/**
 * API Response Validation Utilities
 *
 * Provides schema validation and data integrity checks for API responses
 * from Alpaca and Alpha Vantage to ensure data reliability.
 */

/**
 * Validates a numeric value is within acceptable bounds
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {Object} options - Validation options
 * @returns {number} Validated number
 */
function validateNumber(value, fieldName, options = {}) {
  const { min = -Infinity, max = Infinity, allowNull = false, defaultValue = null } = options;

  if (value === null || value === undefined) {
    if (allowNull) return defaultValue;
    throw new Error(`${fieldName} is required but was ${value}`);
  }

  const num = Number(value);

  if (isNaN(num)) {
    throw new Error(`${fieldName} is not a valid number: ${value}`);
  }

  if (!isFinite(num)) {
    throw new Error(`${fieldName} must be finite: ${value}`);
  }

  if (num < min) {
    throw new Error(`${fieldName} must be >= ${min}, got ${num}`);
  }

  if (num > max) {
    throw new Error(`${fieldName} must be <= ${max}, got ${num}`);
  }

  return num;
}

/**
 * Validates a price value (must be positive and finite)
 * @param {any} price - Price to validate
 * @param {string} fieldName - Name of the field
 * @param {boolean} allowNull - Whether null is acceptable
 * @returns {number|null} Validated price
 */
function validatePrice(price, fieldName = 'price', allowNull = false) {
  return validateNumber(price, fieldName, { min: 0, allowNull, defaultValue: null });
}

/**
 * Validates a volume value (must be non-negative integer)
 * @param {any} volume - Volume to validate
 * @param {string} fieldName - Name of the field
 * @param {boolean} allowNull - Whether null is acceptable
 * @returns {number|null} Validated volume
 */
function validateVolume(volume, fieldName = 'volume', allowNull = false) {
  const validated = validateNumber(volume, fieldName, { min: 0, allowNull, defaultValue: null });
  if (validated !== null && !Number.isInteger(validated)) {
    throw new Error(`${fieldName} must be an integer, got ${validated}`);
  }
  return validated;
}

/**
 * Validates a timestamp
 * @param {any} timestamp - Timestamp to validate (Unix timestamp or ISO string)
 * @param {string} fieldName - Name of the field
 * @returns {number} Unix timestamp in milliseconds
 */
function validateTimestamp(timestamp, fieldName = 'timestamp') {
  if (timestamp === null || timestamp === undefined) {
    throw new Error(`${fieldName} is required`);
  }

  // Try parsing as number (Unix timestamp)
  const num = Number(timestamp);
  if (!isNaN(num) && num > 0) {
    return num;
  }

  // Try parsing as date string
  const date = new Date(timestamp);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  throw new Error(`${fieldName} is not a valid timestamp: ${timestamp}`);
}

/**
 * Validates Alpaca quote data
 * @param {Object} quote - Quote object from Alpaca
 * @returns {Object} Validated quote
 */
function validateAlpacaQuote(quote) {
  if (!quote || typeof quote !== 'object') {
    throw new Error('Quote must be a valid object');
  }

  return {
    price: validatePrice(quote.p, 'quote.price'),
    size: validateVolume(quote.s, 'quote.size', true),
    timestamp: validateTimestamp(quote.t, 'quote.timestamp'),
  };
}

/**
 * Validates Alpaca bar data (OHLCV)
 * @param {Object} bar - Bar object from Alpaca
 * @returns {Object} Validated bar
 */
function validateAlpacaBar(bar) {
  if (!bar || typeof bar !== 'object') {
    throw new Error('Bar must be a valid object');
  }

  const open = validatePrice(bar.OpenPrice || bar.o, 'bar.open');
  const high = validatePrice(bar.HighPrice || bar.h, 'bar.high');
  const low = validatePrice(bar.LowPrice || bar.l, 'bar.low');
  const close = validatePrice(bar.ClosePrice || bar.c, 'bar.close');
  const volume = validateVolume(bar.Volume || bar.v, 'bar.volume', true);

  // Validate price relationships
  if (high < low) {
    throw new Error(`Invalid bar: high (${high}) < low (${low})`);
  }
  if (high < open || high < close) {
    throw new Error(`Invalid bar: high (${high}) < open/close`);
  }
  if (low > open || low > close) {
    throw new Error(`Invalid bar: low (${low}) > open/close`);
  }

  return {
    open,
    high,
    low,
    close,
    volume,
    timestamp: bar.Timestamp || bar.t || Date.now(),
  };
}

/**
 * Validates option Greeks
 * @param {Object} greeks - Greeks object from Alpaca
 * @returns {Object} Validated Greeks or null
 */
function validateGreeks(greeks) {
  if (!greeks || typeof greeks !== 'object') {
    return null;
  }

  const validateGreek = (value, name, min, max) => {
    if (value === null || value === undefined) return null;
    return validateNumber(value, name, { min, max, allowNull: true, defaultValue: null });
  };

  return {
    delta: validateGreek(greeks.delta, 'delta', -1, 1),
    gamma: validateGreek(greeks.gamma, 'gamma', 0, Infinity),
    theta: validateGreek(greeks.theta, 'theta', -Infinity, Infinity),
    vega: validateGreek(greeks.vega, 'vega', 0, Infinity),
  };
}

/**
 * Validates Alpaca option quote
 * @param {Object} quote - Option quote from Alpaca
 * @returns {Object} Validated option quote
 */
function validateOptionQuote(quote) {
  if (!quote || typeof quote !== 'object') {
    throw new Error('Option quote must be a valid object');
  }

  return {
    bid: validatePrice(quote.bid, 'quote.bid', true),
    ask: validatePrice(quote.ask, 'quote.ask', true),
    volume: validateVolume(quote.volume, 'quote.volume', true),
    openInterest: validateVolume(quote.open_interest, 'quote.openInterest', true),
    greeks: validateGreeks(quote.greeks),
    impliedVolatility: validateNumber(quote.impliedVolatility, 'quote.impliedVolatility', {
      min: 0,
      max: 10,
      allowNull: true,
      defaultValue: null
    }),
  };
}

/**
 * Validates Alpha Vantage fundamental data response
 * @param {Object} data - Response data from Alpha Vantage OVERVIEW endpoint
 * @returns {Object} Validated fundamental data
 */
function validateAlphaVantageFundamentals(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Alpha Vantage response must be a valid object');
  }

  // Check for API errors
  if (data.Error) {
    throw new Error(`Alpha Vantage Error: ${data.Error}`);
  }

  if (data.Note) {
    throw new Error('Alpha Vantage rate limit exceeded');
  }

  if (data['Information']) {
    throw new Error(`Alpha Vantage: ${data['Information']}`);
  }

  // Check for required fields
  const missingFields = [];
  const expectedFields = ['Symbol', 'MarketCapitalization'];
  for (const field of expectedFields) {
    if (!(field in data)) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    console.warn(`Alpha Vantage response missing fields: ${missingFields.join(', ')}`);
  }

  // Extract and validate numeric fields with fallbacks
  const parseNumeric = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === 'None' || value === '-') {
      return defaultValue;
    }
    const num = parseFloat(value);
    return isNaN(num) || !isFinite(num) ? defaultValue : num;
  };

  return {
    marketCap: parseNumeric(data.MarketCapitalization),
    pe: parseNumeric(data.PERatio),
    pb: parseNumeric(data.PriceToBookRatio),
    eps: parseNumeric(data.EPS),
    dividendYield: parseNumeric(data.DividendYield),
    beta: parseNumeric(data.Beta),
    week52High: parseNumeric(data['52WeekHigh']),
    week52Low: parseNumeric(data['52WeekLow']),
    sector: data.Sector || '',
    industry: data.Industry || '',
    description: data.Description || '',
    // Additional fields that are available
    profitMargin: parseNumeric(data.ProfitMargin),
    operatingMargin: parseNumeric(data.OperatingMarginTTM),
    returnOnAssets: parseNumeric(data.ReturnOnAssetsTTM),
    returnOnEquity: parseNumeric(data.ReturnOnEquityTTM),
    revenuePerShare: parseNumeric(data.RevenuePerShareTTM),
    pegRatio: parseNumeric(data.PEGRatio),
    bookValue: parseNumeric(data.BookValue),
    sharesOutstanding: parseNumeric(data.SharesOutstanding),
  };
}

/**
 * Validates account info from Alpaca
 * @param {Object} account - Account object from Alpaca
 * @returns {Object} Validated account info
 */
function validateAccountInfo(account) {
  if (!account || typeof account !== 'object') {
    throw new Error('Account info must be a valid object');
  }

  return {
    cash: validatePrice(account.cash, 'account.cash'),
    buyingPower: validatePrice(account.buying_power, 'account.buyingPower'),
    portfolioValue: validatePrice(account.portfolio_value, 'account.portfolioValue'),
    equity: validatePrice(account.equity, 'account.equity', true),
    lastEquity: validatePrice(account.last_equity, 'account.lastEquity', true),
  };
}

/**
 * Safely extract and validate response data with error handling
 * @param {Function} validator - Validation function to call
 * @param {any} data - Data to validate
 * @param {string} context - Context for error messages
 * @returns {any} Validated data or null on error
 */
function safeValidate(validator, data, context = 'data') {
  try {
    return validator(data);
  } catch (error) {
    console.error(`Validation error for ${context}:`, error.message);
    console.error('Invalid data:', JSON.stringify(data).substring(0, 200));
    return null;
  }
}

module.exports = {
  validateNumber,
  validatePrice,
  validateVolume,
  validateTimestamp,
  validateAlpacaQuote,
  validateAlpacaBar,
  validateGreeks,
  validateOptionQuote,
  validateAlphaVantageFundamentals,
  validateAccountInfo,
  safeValidate,
};
