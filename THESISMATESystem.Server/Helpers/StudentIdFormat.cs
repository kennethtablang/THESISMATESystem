using System.Text.RegularExpressions;

namespace THESISMATESystem.Server.Helpers
{
    /// <summary>
    /// PSU student numbers: two-digit entry year, two-letter campus code, four-digit serial,
    /// e.g. "23-LN-5825". Mirrors STUDENT_ID_PATTERN in the client's utils/studentId.js.
    /// </summary>
    public static partial class StudentIdFormat
    {
        public const string Example = "23-LN-5825";
        public const string InvalidMessage = $"Student ID must follow the format {Example} (2 digits, 2 letters, 4 digits).";

        [GeneratedRegex(@"^\d{2}-[A-Z]{2}-\d{4}$")]
        private static partial Regex Pattern();

        // Trimmed and upper-cased, so "23-ln-5825 " and "23-LN-5825" are the same ID everywhere.
        public static string Normalize(string? value) => (value ?? string.Empty).Trim().ToUpperInvariant();

        public static bool IsValid(string? value) => Pattern().IsMatch(Normalize(value));
    }
}
