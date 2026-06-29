using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class GroupDeadline
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public CapstoneGroup Group { get; set; } = null!;

        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DueDate { get; set; }

        public string CreatedById { get; set; } = string.Empty;
        public ApplicationUser CreatedBy { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public bool IsActive { get; set; } = true;
    }
}
