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
            => DateTime.SpecifyKind(reader.GetDateTime(), DateTimeKind.Utc);

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
            => writer.WriteStringValue(DateTime.SpecifyKind(value, DateTimeKind.Utc));
    }

    public sealed class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
    {
        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null) return null;
            return DateTime.SpecifyKind(reader.GetDateTime(), DateTimeKind.Utc);
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value is null) writer.WriteNullValue();
            else writer.WriteStringValue(DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));
        }
    }
}
