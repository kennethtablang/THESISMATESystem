using System.ComponentModel.DataAnnotations;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class SubmitChapterRequestDto
    {
        [Required, Range(1, 5)] public int ChapterNumber { get; set; }
        [Required] public IFormFile File { get; set; } = null!;
    }

    public class UpdateChapterStatusRequestDto
    {
        [Required] public ChapterStatus Status { get; set; }
    }

    public class AddRevisionNoteRequestDto
    {
        [Required] public string Notes { get; set; } = string.Empty;
    }
}
