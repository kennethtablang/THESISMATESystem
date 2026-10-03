// Defense phase rules shared across pages. Mirrors Helpers/DefensePhases.cs on the server.

// The defenses every group goes through, in order. Re-Defense is not one of them: it is a
// re-take of one of these, recorded on the schedule as `reDefenseOf`.
export const REGULAR_PHASES = ['TitleDefense', 'ProposalDefense', 'PreFinalDefense', 'FinalDefense']

export const PHASE_LABELS = {
  TitleDefense:    'Title Defense',
  ProposalDefense: 'Proposal Defense',
  PreFinalDefense: 'Pre-Final Defense',
  FinalDefense:    'Final Defense',
  ReDefense:       'Re-Defense',
}

// "Re-Defense (Final Defense)" for a re-take, the plain label otherwise.
export function defensePhaseLabel(phase, reDefenseOf) {
  const base = PHASE_LABELS[phase] ?? phase ?? 'Defense'
  return phase === 'ReDefense' && reDefenseOf ? `${base} (${PHASE_LABELS[reDefenseOf] ?? reDefenseOf})` : base
}

// The rubric a defense is rated with: a re-defense reuses the rubric of the defense it re-takes.
export function rubricPhaseOf(defense) {
  if (defense?.phase !== 'ReDefense') return defense?.phase
  return defense.reDefenseOf ?? 'FinalDefense'
}
