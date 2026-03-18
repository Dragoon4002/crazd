package game

import (
	"crypto/sha256"
	"encoding/binary"
)

// payoutTables[risk][picksCount][hitCount-1] → multiplier (1-indexed: index 0 = 1 hit)
var payoutTables = map[string]map[int][]float64{
	"classic": {
		1:  {3.4},
		2:  {1.0, 6},
		3:  {0, 1.8, 25},
		4:  {0, 1.4, 6, 60},
		5:  {0, 0.7, 3, 14, 200},
		6:  {0, 0, 2, 6, 30, 400},
		7:  {0, 0, 1.5, 4, 14, 80, 700},
		8:  {0, 0, 1, 2.8, 7, 35, 200, 1000},
		9:  {0, 0, 0, 2, 5, 18, 80, 400, 1500},
		10: {0, 0, 0, 1.5, 4, 12, 45, 200, 800, 2500},
	},
	"low": {
		1:  {2.85},
		2:  {1.7, 4},
		3:  {1, 1.4, 15},
		4:  {0.5, 1.4, 4, 40},
		5:  {0.3, 1.2, 2, 10, 100},
		6:  {0.3, 0.8, 1.8, 5, 20, 200},
		7:  {0, 0.5, 1.5, 3, 10, 50, 400},
		8:  {0, 0.5, 1, 2.5, 5, 20, 100, 500},
		9:  {0, 0.3, 0.8, 2, 4, 10, 50, 200, 800},
		10: {0, 0.3, 0.6, 1.5, 3, 8, 25, 100, 400, 1000},
	},
	"medium": {
		1:  {3.96},
		2:  {0, 8},
		3:  {0, 2.2, 40},
		4:  {0, 1.5, 8, 100},
		5:  {0, 0, 4, 20, 400},
		6:  {0, 0, 2, 8, 50, 800},
		7:  {0, 0, 1.5, 5, 20, 150, 1200},
		8:  {0, 0, 1, 3, 10, 60, 400, 2000},
		9:  {0, 0, 0, 2, 8, 30, 150, 800, 3000},
		10: {0, 0, 0, 1.5, 5, 20, 80, 400, 1500, 5000},
	},
	"high": {
		1:  {3.96},
		2:  {0, 15},
		3:  {0, 0, 100},
		4:  {0, 0, 10, 250},
		5:  {0, 0, 4, 50, 1000},
		6:  {0, 0, 0, 15, 100, 2000},
		7:  {0, 0, 0, 8, 40, 400, 4000},
		8:  {0, 0, 0, 4, 20, 100, 1000, 6000},
		9:  {0, 0, 0, 2, 10, 50, 500, 2000, 10000},
		10: {0, 0, 0, 0, 8, 30, 200, 1000, 5000, 20000},
	},
}

// GenerateKenoNumbers derives 10 unique drawn numbers from serverSeed + clientSeed.
// Uses SHA256 to produce hash1/hash2, then xorshift64* + partial Fisher-Yates.
// The TypeScript kenoNumbers.ts must implement the same algorithm for client verification.
func GenerateKenoNumbers(serverSeed, clientSeed string) []int {
	combined := serverSeed + ":" + clientSeed
	h := sha256.Sum256([]byte(combined))

	hash1 := binary.BigEndian.Uint32(h[0:4])
	hash2 := binary.BigEndian.Uint32(h[4:8])

	// xorshift64* — uint64 naturally wraps at 64 bits
	seed := uint64(hash1)<<32 | uint64(hash2)

	rand := func() float64 {
		seed ^= seed << 13
		seed ^= seed >> 7
		seed ^= seed << 17
		return float64(seed&0xffffffff) / 0xffffffff
	}

	// Array [1..40]
	arr := make([]int, 40)
	for i := range arr {
		arr[i] = i + 1
	}

	// Partial Fisher-Yates: shuffle only first 10 positions
	for i := 0; i < 10; i++ {
		j := i + int(rand()*float64(40-i))
		arr[i], arr[j] = arr[j], arr[i]
	}

	return arr[:10]
}

// CalculateKenoPayout returns hits count, multiplier, and payout amount.
func CalculateKenoPayout(picks, drawn []int, risk string, betAmount float64) (hits int, multiplier float64, payout float64) {
	drawnSet := make(map[int]bool, len(drawn))
	for _, n := range drawn {
		drawnSet[n] = true
	}
	for _, p := range picks {
		if drawnSet[p] {
			hits++
		}
	}

	riskTable, ok := payoutTables[risk]
	if !ok {
		riskTable = payoutTables["classic"]
	}
	row, ok := riskTable[len(picks)]
	if !ok || hits == 0 || hits > len(row) {
		return hits, 0, 0
	}

	multiplier = row[hits-1]
	payout = multiplier * betAmount
	return
}
