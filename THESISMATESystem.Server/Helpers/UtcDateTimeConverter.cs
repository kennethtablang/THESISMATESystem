using System.Text.Json;
using System.Text.Json.Serialization;

namespace THESISMATESystem.Server.Helpers
{
    /// <summary>
    /// Forces every DateTime/DateTime? round-trip through the API to be treated as UTC.
    ///
    /// Problem: SQL Server stores DateTime without timezone info, so EF Core returns
    /// DateTimeKind.Unspecified. System.Text.Json serialises Unspecified without the 'Z'
    /// suffix (e.g. "2025-06-02T02:30:00"), which browsers parse as LOCAL time instead of
    /// UTC — making every time appear 8 hours wrong for PHT (UTC+8) clients.
    ///
    /// Fix: re-specify the kind as Utc so the serialiser always writes "...Z".
    /// </summary>
    public sealed class UtcDateTimeConverter : JsonConverter<DateTime>
    {
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            => UtcDateTime.FromJson(ref reader);

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
            => writer.WriteStringValue(DateTime.SpecifyKind(value, DateTimeKind.Utc));
    }

    public sealed class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
    {
        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null) return null;
            return UtcDateTime.FromJson(ref reader);
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value is null) writer.WriteNullValue();
            else writer.WriteStringValue(DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));
        }
    }

    internal static class UtcDateTime
    {
        /// <summary>
        /// Reads an incoming datetime as UTC.
        ///
        /// The kind returned by <see cref="Utf8JsonReader.GetDateTime"/> depends on what the
        /// client wrote: 'Z' gives Utc, a numeric offset gives Local, and no offset at all gives
        /// Unspecified. Blindly calling SpecifyKind(Utc) on all three relabels the last two
        /// instead of converting them — a form that posted a 7:00 AM wall clock came back as
        /// 3:00 PM, because 07:00 was stamped 'Z' and the browser then added PHT's +8.
        ///
        /// So: convert when the value carries an offset, and read an offset-less datetime as
        /// Philippine wall-clock time, which is what a user typing into a form means. A
        /// date-only value ("2026-09-20", no time component) is left at midnight UTC — that is
        /// how deadlines are already sent and stored.
        /// </summary>
        public static DateTime FromJson(ref Utf8JsonReader reader)
        {
            var value = reader.GetDateTime();

            return value.Kind switch
            {
                DateTimeKind.Utc   => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => HasTimeOfDay(ref reader)
                        ? PhilippineTime.ToUtc(value)
                        : DateTime.SpecifyKind(value, DateTimeKind.Utc),
            };
        }

        // "2026-09-20" is a date; "2026-09-20T07:00" is a wall clock. Only the latter needs the
        // PHT reading — a bare date has no time to misplace, and midnight-UTC is the existing
        // contract for deadline fields.
        private static bool HasTimeOfDay(ref Utf8JsonReader reader)
        {
            if (!reader.HasValueSequence) return Contains(reader.ValueSpan);

            // Multi-segment buffers only occur when the reader streams; 'T' is a single byte,
            // so it cannot straddle a segment boundary and a per-segment scan is exact.
            foreach (var segment in reader.ValueSequence)
                if (Contains(segment.Span)) return true;
            return false;

            static bool Contains(ReadOnlySpan<byte> span)
                => span.IndexOf((byte)'T') >= 0 || span.IndexOf((byte)'t') >= 0;
        }
    }
}
