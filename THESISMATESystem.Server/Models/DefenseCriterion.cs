using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Models
{
    public class DefenseCriterion
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Weight { get; set; } // percentage, e.g. 20.00
        public int MaxScore { get; set; } = 100;
        public bool IsActive { get; set; } = true;
        public DefensePhase Phase { get; set; } = DefensePhase.TitleDefense;

        public ICollection<DefenseRating> DefenseRatings { get; set; } = [];
    }
}
