namespace THESISMATESystem.Server.Helpers
{
    // Philippines is permanently UTC+8 with no DST
    public static class PhilippineTime
    {
        private static readonly TimeSpan Offset = TimeSpan.FromHours(8);
        // Return UTC — UtcDateTimeConverter appends 'Z' so browsers convert to local time (PHT = +8).
        // Storing PHT here would double-shift: PHT → 'Z' → browser adds +8 again = UTC+16.
        public static DateTime Now => DateTime.UtcNow;

        /// <summary>
        /// Throws <see cref="InvalidOperationException"/> if the given UTC datetime falls
        /// outside the 6:00 AM – 7:00 PM (PHT) scheduling window (start or end).
        /// </summary>
        public static void ValidateScheduleHours(DateTime utcDateTime, int durationMinutes)
        {
            var pht      = utcDateTime.Add(Offset);
            var startMin = pht.Hour * 60 + pht.Minute;
            var endMin   = startMin + durationMinutes;

            if (startMin < 6 * 60)
                throw new InvalidOperationException("Defenses cannot be scheduled before 6:00 AM.");
            if (endMin > 19 * 60)
                throw new InvalidOperationException("Defenses cannot extend past 7:00 PM. Choose an earlier time or shorten the duration.");
        }
    }
}
