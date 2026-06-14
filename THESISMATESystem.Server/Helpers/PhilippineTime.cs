namespace THESISMATESystem.Server.Helpers
{
    // Philippines is permanently UTC+8 with no DST
    public static class PhilippineTime
    {
        private static readonly TimeSpan Offset = TimeSpan.FromHours(8);
        public static DateTime Now => DateTime.UtcNow.Add(Offset);
    }
}
