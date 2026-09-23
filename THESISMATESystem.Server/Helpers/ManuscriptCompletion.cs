using System.Net;
using System.Text.RegularExpressions;

namespace THESISMATESystem.Server.Helpers
{
    /// <summary>
    /// Works out how complete a manuscript chapter is from its saved HTML. The editor writes each
    /// sub-topic of the chapter format (Project Context, Objectives of the Project, …) as
    /// <c>&lt;h2 data-subsection="…" data-required="true|false"&gt;Title&lt;/h2&gt;</c> followed by
    /// the students' text, so the share of required sub-topics with text is the chapter's
    /// completion. Optional sub-topics (e.g. Company Profile) never lower the percentage.
    /// </summary>
    public static partial class ManuscriptCompletion
    {
        [GeneratedRegex(@"<h2\b[^>]*\bdata-subsection=""[^""]*""[^>]*>", RegexOptions.IgnoreCase)]
        private static partial Regex SubsectionHeading();

        [GeneratedRegex(@"data-required=""false""", RegexOptions.IgnoreCase)]
        private static partial Regex OptionalFlag();

        [GeneratedRegex("<[^>]+>")]
        private static partial Regex Tag();

        /// <summary>Filled and total required sub-topics, or null for content saved before sub-topics existed.</summary>
        public static (int Filled, int Total)? Subsections(string? html)
        {
            if (string.IsNullOrEmpty(html)) return null;

            var headings = SubsectionHeading().Matches(html);
            if (headings.Count == 0) return null;

            int filled = 0, total = 0;
            for (int i = 0; i < headings.Count; i++)
            {
                if (OptionalFlag().IsMatch(headings[i].Value)) continue;
                total++;

                // The body runs from the end of this heading to the start of the next one.
                var headingClose = html.IndexOf("</h2>", headings[i].Index, StringComparison.OrdinalIgnoreCase);
                var bodyStart = headingClose < 0 ? headings[i].Index + headings[i].Length : headingClose + 5;
                var bodyEnd = i + 1 < headings.Count ? headings[i + 1].Index : html.Length;
                if (bodyEnd <= bodyStart) continue;

                var body = html[bodyStart..bodyEnd];
                var text = WebUtility.HtmlDecode(Tag().Replace(body, " ")).Trim();
                if (text.Length > 0 || body.Contains("<img", StringComparison.OrdinalIgnoreCase)) filled++;
            }

            return (filled, total);
        }

        public static int Percent(string sectionKey, string? html, int wordCount)
        {
            var subs = sectionKey == "references" ? null : Subsections(html);
            if (subs is { Total: > 0 } s) return (int)Math.Round(s.Filled * 100.0 / s.Total);

            // References has no sub-topics, and chapters saved before the chapter format was
            // introduced have none either: judge those by whether they hold real text.
            return sectionKey == "references"
                ? (wordCount > 0 ? 100 : 0)
                : (wordCount > 100 ? 100 : 0);
        }
    }
}
