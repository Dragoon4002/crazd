package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"goLangServer/db"
)

func main() {
	// Load env
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env not found")
	}

	if os.Getenv("DATABASE_URL") == "" {
		log.Fatal("DATABASE_URL not set")
	}

	// Init postgres
	if err := db.InitPostgres(); err != nil {
		log.Fatalf("Failed to init postgres: %v", err)
	}
	defer db.ClosePostgres()

	ctx := context.Background()

	// Test wallets with various PnL
	testWallets := []struct {
		addr   string
		amount float64
	}{
		{"GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN", 250.75},
		{"GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB", 185.50},
		{"GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKZQ4IQTM7ZG3V49XNKDQ", 120.25},
		{"GD6WNTESP5N5RKQAOGAWCJYUEFKDE4VCYN4MSVFGAWJL3YF76QSXVQK", 95.00},
		{"GBUGKX4JVZFVKQ4GXALQJMKPSTQYB3SGPK6XBCQNZB7HQFJYVYQJQH", 67.50},
		{"GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLNKU7BVNP2UN5AWWPQB2X5", 45.25},
		{"GDOEVDDBU6OBWKL7VHDAOKD77UP4DQNYFZPJBVN6RFNJ2HHY4JEBVHY", 32.00},
		{"GA7QYNF7SOWQ3GLR2BGMZEHXR6MCXI2QS4PQNKB3FXVTQFZKRYJQNKH", 18.75},
		{"GC4SHB5EZFZQG4ZYXYXQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQX", -5.50},
		{"GDQJUTQYK2MQX2ZWZVFKIYZNPQNUQKXQZQZQZQZQZQZQZQZQZQZQZQY", -25.00},
	}

	fmt.Println("Seeding leaderboard with test data...")

	for _, w := range testWallets {
		// Delete existing
		db.PostgresPool.Exec(ctx, "DELETE FROM wallet_pnl WHERE wallet_address = $1", w.addr)

		// Insert with amount
		_, err := db.PostgresPool.Exec(ctx,
			"INSERT INTO wallet_pnl (wallet_address, amount) VALUES ($1, $2)",
			w.addr, w.amount)
		if err != nil {
			log.Printf("Failed to insert %s: %v", w.addr[:10], err)
		} else {
			fmt.Printf("  %s... -> %.2f\n", w.addr[:10], w.amount)
		}
	}

	fmt.Println("\nDone! Testing leaderboard...")

	// Verify
	records, err := db.GetWalletPnLLeaderboard(ctx, 20)
	if err != nil {
		log.Fatalf("Failed to get leaderboard: %v", err)
	}

	fmt.Printf("\nLeaderboard (%d entries):\n", len(records))
	for _, r := range records {
		fmt.Printf("  #%d %s... %.2f\n", r.Rank, r.WalletAddress[:10], r.Amount)
	}
}
