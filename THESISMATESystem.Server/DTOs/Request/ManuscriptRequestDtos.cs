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
        [Required, MinLength(1)] public string Content { get; set; } = string.Empty;
    }
}
