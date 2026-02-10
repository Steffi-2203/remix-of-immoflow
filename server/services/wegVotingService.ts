import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { wegVotes, wegOwnerVotes, wegUnitOwners, wegAssemblies } from "@shared/schema";

export interface VoteResult {
  voteId: string;
  totalMeaShares: number;
  votedMeaShares: number;
  quorumReached: boolean;
  quorumPercent: number;
  yesShares: number;
  noShares: number;
  abstainShares: number;
  majorityReached: boolean;
  requiredMajority: string;
  resultText: string;
}

export async function calculateVoteResult(voteId: string, organizationId: string): Promise<VoteResult> {
  const [vote] = await db.select().from(wegVotes).where(eq(wegVotes.id, voteId));
  if (!vote) throw new Error("Abstimmung nicht gefunden");

  const assembly = await db.select().from(wegAssemblies)
    .where(and(eq(wegAssemblies.id, vote.assemblyId), eq(wegAssemblies.organizationId, organizationId)))
    .limit(1);
  if (!assembly.length) throw new Error("Versammlung gehört nicht zu dieser Organisation");

  const allOwners = await db.select().from(wegUnitOwners)
    .where(eq(wegUnitOwners.organizationId, organizationId));
  const totalMeaShares = allOwners.reduce((sum, o) => sum + Number(o.meaShare), 0);

  const ownerVotes = await db.select().from(wegOwnerVotes)
    .where(eq(wegOwnerVotes.voteId, voteId));

  let yesShares = 0, noShares = 0, abstainShares = 0;
  for (const ov of ownerVotes) {
    const owner = allOwners.find(o => o.ownerId === ov.ownerId);
    if (!owner) continue;
    const share = Number(owner.meaShare);
    if (ov.voteValue === 'ja') yesShares += share;
    else if (ov.voteValue === 'nein') noShares += share;
    else abstainShares += share;
  }

  const votedMeaShares = yesShares + noShares + abstainShares;
  const quorumPercent = totalMeaShares > 0 ? (votedMeaShares / totalMeaShares) * 100 : 0;
  const quorumReached = quorumPercent > 50;

  const requiredMajority = vote.requiredMajority || 'einfach';
  let majorityReached = false;
  const yesPercent = votedMeaShares > 0 ? (yesShares / votedMeaShares) * 100 : 0;
  
  switch (requiredMajority) {
    case 'einfach':
      majorityReached = yesShares > noShares;
      break;
    case 'zweidrittel':
      majorityReached = yesPercent >= 66.67;
      break;
    case 'einstimmig':
      majorityReached = noShares === 0 && yesShares > 0;
      break;
    default:
      majorityReached = yesShares > noShares;
  }

  let resultText = '';
  if (!quorumReached) {
    resultText = `Beschlussunfähig: Quorum nicht erreicht (${quorumPercent.toFixed(1)}% der MEA-Anteile anwesend, >50% erforderlich)`;
  } else if (majorityReached) {
    resultText = `Angenommen: ${yesPercent.toFixed(1)}% Ja-Stimmen (${requiredMajority} Mehrheit erreicht)`;
  } else {
    resultText = `Abgelehnt: ${yesPercent.toFixed(1)}% Ja-Stimmen (${requiredMajority} Mehrheit nicht erreicht)`;
  }

  return {
    voteId,
    totalMeaShares,
    votedMeaShares,
    quorumReached,
    quorumPercent,
    yesShares,
    noShares,
    abstainShares,
    majorityReached,
    requiredMajority,
    resultText,
  };
}
