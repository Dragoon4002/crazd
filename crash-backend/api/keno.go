package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"goLangServer/crypto"
	"goLangServer/db"
	"goLangServer/game"
	"goLangServer/ws"
)

/* =========================
   INIT
========================= */

type kenoInitResponse struct {
	GameID         string `json:"gameId"`
	ClientSeed     string `json:"clientSeed"`
	ServerSeedHash string `json:"serverSeedHash"`
}

// HandleKenoInit generates a fresh server+client seed pair, stores it in DB,
// and returns the gameId, clientSeed, and serverSeedHash to the frontend.
func HandleKenoInit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	serverSeed, serverSeedHash := crypto.GenerateServerSeed()
	clientSeed, _ := crypto.GenerateServerSeed() // reuse helper; we only need the random hex
	gameID := fmt.Sprintf("keno-%d", time.Now().UnixNano())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.StoreKenoGame(ctx, gameID, serverSeed, clientSeed, serverSeedHash); err != nil {
		log.Printf("❌ StoreKenoGame: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(kenoInitResponse{
		GameID:         gameID,
		ClientSeed:     clientSeed,
		ServerSeedHash: serverSeedHash,
	})
}

/* =========================
   PLAY
========================= */

type kenoPlayRequest struct {
	GameID        string  `json:"gameId"`
	Picks         []int   `json:"picks"`
	RiskLevel     string  `json:"riskLevel"`
	PlayerAddress string  `json:"playerAddress"`
	BetAmount     float64 `json:"betAmount"`
	TxHash        string  `json:"txHash"`
}

type kenoPlayResponse struct {
	ServerSeed string `json:"serverSeed"`
}

// HandleKenoPlay loads the sealed seeds, generates the drawn numbers, computes
// payout, persists the result, and triggers PayPlayer asynchronously.
// It returns only the serverSeed — the frontend derives drawn numbers locally.
func HandleKenoPlay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req kenoPlayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if req.GameID == "" || len(req.Picks) == 0 || req.BetAmount <= 0 || req.PlayerAddress == "" {
		http.Error(w, "missing required fields", http.StatusBadRequest)
		return
	}
	if len(req.Picks) > 10 {
		http.Error(w, "max 10 picks", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	g, err := db.GetKenoGame(ctx, req.GameID)
	if err != nil || g == nil {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}
	if g.Status != "pending" {
		http.Error(w, "game already played", http.StatusConflict)
		return
	}

	if req.RiskLevel == "" {
		req.RiskLevel = "classic"
	}

	// Generate drawn numbers server-side (same algorithm as frontend kenoNumbers.ts)
	drawn := game.GenerateKenoNumbers(g.ServerSeed, g.ClientSeed)
	hits, multiplier, payout := game.CalculateKenoPayout(req.Picks, drawn, req.RiskLevel, req.BetAmount)

	// Convert to int32 for pgx INTEGER[]
	picksI32 := make([]int32, len(req.Picks))
	for i, p := range req.Picks {
		picksI32[i] = int32(p)
	}
	drawnI32 := make([]int32, len(drawn))
	for i, d := range drawn {
		drawnI32[i] = int32(d)
	}

	result := &db.KenoResult{
		PlayerAddress: req.PlayerAddress,
		Picks:         picksI32,
		RiskLevel:     req.RiskLevel,
		BetAmount:     req.BetAmount,
		DrawnNumbers:  drawnI32,
		Hits:          hits,
		Multiplier:    multiplier,
		Payout:        payout,
		TxHash:        req.TxHash,
	}

	if err := db.UpdateKenoGame(ctx, req.GameID, result); err != nil {
		log.Printf("❌ UpdateKenoGame: %v", err)
		// Non-fatal — still reveal the seed
	}

	// PnL accounting
	go func() {
		gCtx, gCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer gCancel()
		if err := db.SubtractWalletPnL(gCtx, req.PlayerAddress, req.BetAmount); err != nil {
			log.Printf("⚠️  SubtractWalletPnL: %v", err)
		}
		if payout > 0 {
			if err := db.AddWalletPnL(gCtx, req.PlayerAddress, payout); err != nil {
				log.Printf("⚠️  AddWalletPnL: %v", err)
			}
		}
	}()

	// Fire contract payout asynchronously
	if payout > 0 {
		ws.PayPlayerAsync(req.PlayerAddress, payout)
	}

	log.Printf("🎲 Keno game %s — player %s | picks=%d hits=%d mult=%.2fx payout=%.4f",
		req.GameID, req.PlayerAddress, len(req.Picks), hits, multiplier, payout)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(kenoPlayResponse{ServerSeed: g.ServerSeed})
}
