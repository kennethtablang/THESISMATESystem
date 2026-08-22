namespace THESISMATESystem.Server.Helpers
{
    /// <summary>
    /// Extension allowlists for user uploads.
    /// Uploads land under wwwroot, which is served statically, so an unrestricted extension
    /// (.html, .svg, .xhtml) would be served back as active content from this app's own origin.
    /// X-Content-Type-Options only stops MIME sniffing — it does not stop a correctly-declared
    /// text/html — so the extension itself has to be constrained at the point of upload.
    /// </summary>
    public static class UploadValidation
    {
        public static readonly string[] DocumentExtensions = [".pdf", ".doc", ".docx"];
        public static readonly string[] ImageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

        public static bool HasAllowedExtension(string? fileName, string[] allowed)
        {
            if (string.IsNullOrWhiteSpace(fileName)) return false;
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            return allowed.Contains(ext);
        }

        public static string DescribeAllowed(string[] allowed) =>
            string.Join(", ", allowed.Select(e => e.TrimStart('.')));
    }
}
