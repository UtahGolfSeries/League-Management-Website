/**
 * Calculates the number of "Pops" (handicap strokes) a player gets on a specific hole.
 */
export const calculateHolePops = (playerHandicap: number, holeHandicap: number, isNineHoleRound: boolean = false) => {
  let pops = 0;
  // If it's a 9-hole round, the effective handicap should already be halved before passing it here
  if (playerHandicap >= holeHandicap) pops++;
  if (playerHandicap >= holeHandicap + (isNineHoleRound ? 9 : 18)) pops++; // Double pops
  return pops;
};

/**
 * The central engine that determines the score/points for a round based on Game Type.
 */
export const calculateTournamentResult = (
  userCard: any, 
  partnerCard: any, 
  gameType: string, 
  course: any
) => {
  if (!userCard || !course) return 0;

  const isNineHoles = userCard.holes_played === 9;
  const hcp = userCard.handicap_index || 0;

  switch (gameType) {
    case 'Chicago':
      return userCard.hole_scores.reduce((total: number, gross: number, i: number) => {
        if (gross === 0) return total; // Skip unplayed holes
        
        const par = course.par_values[i];
        const holeHcp = course.handicap_values[i];
        const pops = calculateHolePops(hcp, holeHcp, isNineHoles);
        const net = gross - pops;
        const diff = net - par;

        // Chicago Point Values
        if (diff <= -2) return total + 8; // Eagle or better
        if (diff === -1) return total + 4; // Birdie
        if (diff === 0)  return total + 2; // Par
        if (diff === 1)  return total + 1; // Bogey
        return total; // Double Bogey or worse
      }, 0);

    case '2-Man Best Ball':
      if (!partnerCard) return userCard.net_score; // Fallback if partner is missing
      return userCard.hole_scores.reduce((total: number, p1Gross: number, i: number) => {
        const holeHcp = course.handicap_values[i];
        
        const p1Net = p1Gross - calculateHolePops(hcp, holeHcp, isNineHoles);
        const p2Net = partnerCard.hole_scores[i] - calculateHolePops(partnerCard.handicap_index, holeHcp, isNineHoles);
        
        return total + Math.min(p1Net, p2Net);
      }, 0);

    case 'Match Play':
      // This returns "Holes Up". Usually requires a more complex UI to show +/-
      if (!partnerCard) return 0;
      return userCard.hole_scores.reduce((status: number, p1Gross: number, i: number) => {
        const holeHcp = course.handicap_values[i];
        const p1Net = p1Gross - calculateHolePops(hcp, holeHcp, isNineHoles);
        const p2Net = partnerCard.hole_scores[i] - calculateHolePops(partnerCard.handicap_index, holeHcp, isNineHoles);
        
        if (p1Net < p2Net) return status + 1;
        if (p1Net > p2Net) return status - 1;
        return status;
      }, 0);

    default: // 'Stroke Play'
      return userCard.net_score;
  }
};