using System.ComponentModel.DataAnnotations;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class SaveSectionRequestDto
    {
        [Required] public string Content { get; set; } = string.Empty;
        // Base64-encoded Yjs state snapshot (Y.encodeStateAsUpdate output)
        public string? YjsState { get; set; }
    }

    public class AddManuscriptCommentRequestDto
    {
        // May be empty for a plain highlight (Quote set, no remark).
        [MaxLength(4000)] public string Content { get; set; } = string.Empty;

        [MaxLength(64)] public string? Field { get; set; }
        [MaxLength(2000)] public string? Quote { get; set; }
        [MaxLength(200)] public string? Prefix { get; set; }
    }
}
