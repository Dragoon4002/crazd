package config

import (
	"math/big"
	"time"
)

/* =========================
   GAME MECHANICS - CRASH
========================= */

const (
	// Price simulation
	StartingPrice   = 1.0
	MaxTicks        = 5000
	TickInterval    = 500 * time.Millisecond // 500ms per tick
	RugProbability  = 0.01                   // 1% chance to rug each tick
	GodCandleChance = 0.005                  // 0.5% chance for god candle
	GodCandleMult   = 1.0                    // 1.0x multiplier on god candle
	BigMoveChance   = 0.10                   // 10% chance of big moves
	BigMoveMin      = 0.08                   // Minimum 8% move
	BigMoveMax      = 0.50                   // Maximum 50% move
	DriftMin        = -0.04                  // Minimum drift -4%
	DriftMax        = 0.04                   // Maximum drift +4%

	// Game timing
	CountdownDuration    = 5 * time.Second  // 5 second countdown before game starts
	GameEndWaitDuration  = 10 * time.Second // 10 second wait after game ends
	MaxGameHistory       = 50               // Keep last 50 games in memory
	InitialGroupDuration = 500              // Initial candle group duration in ms
	MergeThreshold       = 100              // Number of candles before merging

	// Peak distribution probabilities (sum to 1.0)
	PeakVeryLow    = 0.40 // 40% chance: 1.0x - 1.5x
	PeakLow        = 0.70 // 30% chance: 1.5x - 3.0x (cumulative)
	PeakMedium     = 0.88 // 18% chance: 3.0x - 10.0x (cumulative)
	PeakHigh       = 0.97 // 9% chance: 10.0x - 50.0x (cumulative)
	PeakExtreme    = 1.00 // 3% chance: 50.0x - 200.0x (cumulative)
	PeakVeryLowMax = 1.5
	PeakLowMax     = 3.0
	PeakMediumMax  = 10.0
	PeakHighMax    = 50.0
	PeakExtremeMax = 200.0
)

/* =========================
   ODDS CONFIGURATION
========================= */

var (
	// Base odds for CandleFlip (2.0x)
	BaseOdds = big.NewInt(2)

	// Minimum odds (1.2x, scaled ×10 = 12)
	MinOdds = big.NewInt(12)

	// Reserve games for liquidity calculation
	ReserveGames = uint64(20)

	// Decimal precision (scale factor 10)
	DecimalPrecision = big.NewInt(10)
)

// GetBaseOddsFloat returns BASE_ODDS as float64 (2.0)
func GetBaseOddsFloat() float64 {
	return 2.0
}

// GetMinOddsFloat returns MIN_ODDS as float64 (1.2)
func GetMinOddsFloat() float64 {
	return 1.2
}

/* =========================
   REDIS TTL CONFIGURATION
========================= */

const (
	// Crash game active bet TTL (1 hour)
	// Key: crash:{gameId}:{playerAddress}
	CrashGameTTL = 1 * time.Hour

	// Crash game cashed out TTL (10 minutes)
	// Key: crash:cashedout:{gameId}:{playerAddress}
	CrashCashedOutTTL = 10 * time.Minute

	// CandleFlip game TTL (2 hours)
	// Key: candle:{gameId}:{playerAddress}
	CandleFlipTTL = 2 * time.Hour

	// Active players set TTL per game (1 hour)
	// Key: game:crash:{gameId}:players
	ActivePlayersTTL = 1 * time.Hour

	// Buyback eligibility TTL (5 minutes after cashout)
	BuybackTTL = 5 * time.Minute
)

/* =========================
   REDIS KEY PATTERNS
========================= */

const (
	// Crash game keys (Hash Map structure)
	// Key: crash:{gameId} -> Hash{playerAddress: [multiplier, amount]}
	RedisCrashHashKey = "crash:%s" // crash:{gameId}

	// CandleFlip game keys
	RedisCandleGameKey = "candle:%s:%s" // candle:{gameId}:{playerAddress}
)

/* =========================
   POSTGRESQL CONFIGURATION
========================= */

const (
	// Database connection settings
	PostgresHost     = "localhost"
	PostgresPort     = 5432
	PostgresUser     = "postgres"
	PostgresPassword = "password"
	PostgresDB       = "gamehouse"

	// Connection pool settings
	MaxOpenConns    = 25
	MaxIdleConns    = 5
	ConnMaxLifetime = 5 * time.Minute
)

/* =========================
   API CONFIGURATION
========================= */

const (
	// Server settings
	ServerPort = "8080"
	ServerHost = "0.0.0.0"

	// CORS settings
	AllowOrigin = "*"

	// Rate limiting
	MaxRequestsPerSecond = 100
)

/* =========================
   WEBSOCKET CONFIGURATION
========================= */

const (
	// WebSocket settings
	WSReadDeadline  = 60 * time.Second
	WSWriteDeadline = 10 * time.Second
	WSPingInterval  = 30 * time.Second

	// Buffer sizes
	WSReadBufferSize  = 1024
	WSWriteBufferSize = 1024

	// Message size limits
	MaxMessageSize = 512 * 1024 // 512KB
)

/* =========================
   VALIDATION CONSTANTS
========================= */

const (
	// Minimum bet amounts (in stroops, 1 XLM = 10_000_000 stroops)
	MinBetAmount = 10000 // 0.001 XLM

	// Maximum bet amounts (in stroops)
	MaxBetAmount = 1000000000000 // 100,000 XLM

	// CandleFlip room limits
	MinRooms = 1
	MaxRooms = 10

	// Multiplier limits
	MinMultiplier = 1.0    // 1.0x minimum
	MaxMultiplier = 1000.0 // 1000x maximum
)

/* =========================
   HELPER FUNCTIONS
========================= */

// StroopsToXLM converts stroops (int64) to XLM (float64)
func StroopsToXLM(stroops int64) float64 {
	return float64(stroops) / 1e7
}

// XLMToStroops converts XLM (float64) to stroops (int64)
func XLMToStroops(xlm float64) int64 {
	return int64(xlm * 1e7)
}
