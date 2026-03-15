import { useState, useCallback } from "react";

const SLOT_SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣", "🃏"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function randomCard() {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const value = rank === "A" ? 11 : ["J", "Q", "K"].includes(rank) ? 10 : parseInt(rank);
  return { rank, suit, value };
}

interface DemoResult {
  win: boolean;
  pnl: number;
  multiplier: number;
  new_balance: number;
  game_data: any;
}

export const useDemoPlay = () => {
  const [demoBalance, setDemoBalance] = useState(1.0);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(async (game: string, bet_amount: number, bet_type?: string): Promise<DemoResult | null> => {
    if (bet_amount > demoBalance) return null;
    setPlaying(true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

    const win = Math.random() < 0.4999;
    const pnl = win ? bet_amount : -bet_amount;
    const newBalance = demoBalance + pnl;
    setDemoBalance(newBalance);

    let game_data: any = {};

    switch (game) {
      case "blackjack": {
        const playerHand = [randomCard(), randomCard()];
        const dealerHand = [randomCard(), randomCard()];
        while (dealerHand.reduce((s, c) => s + c.value, 0) < 17) dealerHand.push(randomCard());
        game_data = { player_hand: playerHand, dealer_hand: dealerHand, player_value: playerHand.reduce((s, c) => s + c.value, 0), dealer_value: dealerHand.reduce((s, c) => s + c.value, 0) };
        break;
      }
      case "mines":
        game_data = { result: win ? "diamond" : "bomb" };
        break;
      case "slots": {
        if (win) {
          const s = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
          game_data = { reels: [s, s, s] };
        } else {
          let reels: string[];
          do { reels = [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]); } while (reels[0] === reels[1] && reels[1] === reels[2]);
          game_data = { reels };
        }
        break;
      }
      case "roulette": {
        if (win) {
          switch (bet_type) {
            case "rouge": game_data = { number: RED_NUMBERS[Math.floor(Math.random() * RED_NUMBERS.length)] }; break;
            case "noir": { const b = Array.from({ length: 36 }, (_, i) => i + 1).filter(n => !RED_NUMBERS.includes(n)); game_data = { number: b[Math.floor(Math.random() * b.length)] }; break; }
            case "zero": game_data = { number: 0 }; break;
            case "pair": game_data = { number: (Math.floor(Math.random() * 18) + 1) * 2 }; break;
            case "impair": game_data = { number: Math.floor(Math.random() * 18) * 2 + 1 }; break;
            case "low": game_data = { number: Math.floor(Math.random() * 18) + 1 }; break;
            case "high": game_data = { number: Math.floor(Math.random() * 18) + 19 }; break;
            default: game_data = { number: Math.floor(Math.random() * 37) };
          }
        } else {
          game_data = { number: Math.floor(Math.random() * 37) };
        }
        break;
      }
      case "crash": {
        const crash_point = win ? 2.0 + Math.random() * 8.0 : 1.0 + Math.random() * 0.5;
        game_data = { crash_point: parseFloat(crash_point.toFixed(2)) };
        break;
      }
      case "plinko":
        game_data = { bucket: Math.floor(Math.random() * 13) };
        break;
      case "dice": {
        const roll = parseFloat((Math.random() * 99.99).toFixed(2));
        game_data = { roll };
        break;
      }
      case "mines_start":
        game_data = { started: true };
        break;
      case "mines_end":
        game_data = { ended: true };
        break;
    }

    setPlaying(false);
    return { win, pnl, multiplier: win ? 2 : 0, new_balance: newBalance, game_data };
  }, [demoBalance]);

  return { play, playing, balance: demoBalance, demoBalance, setDemoBalance };
};
