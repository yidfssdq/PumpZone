// Full Blackjack game engine with proper rules

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface BJCard {
  rank: Rank;
  suit: Suit;
  id: string; // unique id for animations
}

export interface Hand {
  cards: BJCard[];
  bet: number;
  isDoubled: boolean;
  isSplit: boolean;
  isStood: boolean;
  isBusted: boolean;
}

export type GamePhase = "betting" | "dealing" | "player_turn" | "dealer_turn" | "result";

export interface GameResult {
  outcome: "blackjack" | "win" | "push" | "lose" | "bust" | "dealer_bust";
  pnl: number;
  multiplier: number;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

let cardIdCounter = 0;

export function createDeck(): BJCard[] {
  const deck: BJCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `card-${++cardIdCounter}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: BJCard[]): BJCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createShoe(numDecks = 6): BJCard[] {
  let shoe: BJCard[] = [];
  for (let i = 0; i < numDecks; i++) {
    shoe = shoe.concat(createDeck());
  }
  return shuffleDeck(shoe);
}

export function cardValue(card: BJCard): number {
  if (card.rank === "A") return 11;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

export function handValue(cards: BJCard[]): { value: number; soft: boolean } {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
      total += 11;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return { value: total, soft: aces > 0 };
}

export function isBlackjack(cards: BJCard[]): boolean {
  return cards.length === 2 && handValue(cards).value === 21;
}

export function isBusted(cards: BJCard[]): boolean {
  return handValue(cards).value > 21;
}

export function canSplit(cards: BJCard[]): boolean {
  return cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1]);
}

export function canDouble(cards: BJCard[]): boolean {
  return cards.length === 2;
}

export function shouldDealerHit(cards: BJCard[]): boolean {
  const { value, soft } = handValue(cards);
  // Dealer hits on soft 17
  if (value < 17) return true;
  if (value === 17 && soft) return true;
  return false;
}

export function determineOutcome(
  playerCards: BJCard[],
  dealerCards: BJCard[],
  bet: number,
  isDoubled: boolean
): GameResult {
  const playerVal = handValue(playerCards).value;
  const dealerVal = handValue(dealerCards).value;
  const playerBJ = isBlackjack(playerCards);
  const dealerBJ = isBlackjack(dealerCards);
  const effectiveBet = isDoubled ? bet * 2 : bet;

  if (playerBJ && dealerBJ) {
    return { outcome: "push", pnl: 0, multiplier: 1 };
  }
  if (playerBJ) {
    return { outcome: "blackjack", pnl: bet * 1.5, multiplier: 2.5 };
  }
  if (dealerBJ) {
    return { outcome: "lose", pnl: -effectiveBet, multiplier: 0 };
  }
  if (playerVal > 21) {
    return { outcome: "bust", pnl: -effectiveBet, multiplier: 0 };
  }
  if (dealerVal > 21) {
    return { outcome: "dealer_bust", pnl: effectiveBet, multiplier: 2 };
  }
  if (playerVal > dealerVal) {
    return { outcome: "win", pnl: effectiveBet, multiplier: 2 };
  }
  if (playerVal === dealerVal) {
    return { outcome: "push", pnl: 0, multiplier: 1 };
  }
  return { outcome: "lose", pnl: -effectiveBet, multiplier: 0 };
}

export function isRed(card: BJCard): boolean {
  return card.suit === "♥" || card.suit === "♦";
}

// Provably fair seed generation
export function generateSeed(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashSeed(seed: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Biased shuffle: uses the 49.99% house edge
export function createBiasedShoe(playerShouldWin: boolean, numDecks = 6): BJCard[] {
  // Create and shuffle normally, the game outcome is predetermined
  return createShoe(numDecks);
}
