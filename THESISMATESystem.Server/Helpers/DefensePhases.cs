using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Helpers
{
    /// <summary>
    /// Phase rules shared by scheduling, rating, reports and email. A Re-Defense is always a
    /// re-take of one of the regular phases, recorded on <c>DefenseSchedule.ReDefenseOf</c>.
    /// </summary>
    public static class DefensePhases
    {
        // The defenses every group goes through, in order. Re-Defense is not one of them.
        public static readonly DefensePhase[] Regular =
        [
            DefensePhase.TitleDefense,
            DefensePhase.ProposalDefense,
            DefensePhase.PreFinalDefense,
            DefensePhase.FinalDefense,
        ];

        public static bool IsRegular(DefensePhase phase) => phase != DefensePhase.ReDefense;

        public static string Label(DefensePhase phase) => phase switch
        {
            DefensePhase.TitleDefense    => "Title Defense",
            DefensePhase.ProposalDefense => "Proposal Defense",
            DefensePhase.PreFinalDefense => "Pre-Final Defense",
            DefensePhase.FinalDefense    => "Final Defense",
            DefensePhase.ReDefense       => "Re-Defense",
            _                            => phase.ToString()
        };

        // "Re-Defense (Final Defense)" for a re-take, the plain label otherwise.
        public static string Label(DefensePhase phase, DefensePhase? reDefenseOf)
            => phase == DefensePhase.ReDefense && reDefenseOf.HasValue
                ? $"Re-Defense ({Label(reDefenseOf.Value)})"
                : Label(phase);

        // The rubric a defense is rated with: a re-defense reuses the rubric of the defense it re-takes.
        public static DefensePhase RubricPhase(DefensePhase phase, DefensePhase? reDefenseOf)
            => phase == DefensePhase.ReDefense ? reDefenseOf ?? DefensePhase.FinalDefense : phase;

        /// <summary>Throws when a Re-Defense names no regular phase, or a regular defense names one.</summary>
        public static DefensePhase? ValidateReDefenseOf(DefensePhase phase, DefensePhase? reDefenseOf)
        {
            if (phase != DefensePhase.ReDefense) return null;
            if (reDefenseOf is null)
                throw new InvalidOperationException(
                    "Choose which defense is being re-taken (Title, Proposal, Pre-Final or Final Defense) before scheduling a Re-Defense.");
            if (!IsRegular(reDefenseOf.Value))
                throw new InvalidOperationException("A Re-Defense must re-take a Title, Proposal, Pre-Final or Final Defense.");
            return reDefenseOf;
        }
    }
}
