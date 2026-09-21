using System.Globalization;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Services
{
    /// <summary>
    /// Generates defense schedules automatically by treating scheduling as a constraint
    /// satisfaction problem:
    ///   hard constraints — no panelist or adviser in two defenses at once, no venue double-booked,
    ///                      inside the 6 AM – 7 PM window, one defense per group per phase;
    ///   soft constraint  — at most N defenses per faculty member per day.
    /// Groups are placed most-constrained-first (the ones whose people are busiest go first,
    /// while the calendar is still open), each into the earliest slot that satisfies everything.
    /// The result is only a proposal; the Admin reviews it before anything is saved.
    /// </summary>
    public class DefenseAutoScheduler : IDefenseAutoScheduler
    {
        private const int MaxRangeDays = 62;

        private readonly AppDbContext _db;
        private readonly IDefenseService _defenses;

        public DefenseAutoScheduler(AppDbContext db, IDefenseService defenses)
        {
            _db = db;
            _defenses = defenses;
        }

        private sealed record Interval(DateTime Start, DateTime End)
        {
            public bool Overlaps(Interval other) => Start < other.End && other.Start < End;
        }

        public async Task<AutoScheduleProposalDto> ProposeAsync(AutoScheduleRequestDto dto)
        {
            var (dayStart, dayEnd) = ParseWindow(dto.DayStart, dto.DayEnd, dto.DurationMinutes);
            if (dto.EndDate < dto.StartDate)
                throw new InvalidOperationException("The end date must be on or after the start date.");
            if (dto.EndDate.DayNumber - dto.StartDate.DayNumber + 1 > MaxRangeDays)
                throw new InvalidOperationException($"Choose a date range of at most {MaxRangeDays} days.");

            var venues = dto.Venues.Select(v => v.Trim()).Where(v => v.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (venues.Count == 0)
                throw new InvalidOperationException("Add at least one venue.");

            var result = new AutoScheduleProposalDto();

            // ── Candidate groups ────────────────────────────────────────────
            var groupQuery = _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.PanelMembers).ThenInclude(p => p.Panelist)
                .Include(g => g.ChapterSubmissions)
                .AsSplitQuery()
                .Where(g => g.Status == GroupStatus.Active);
            if (dto.GroupIds.Count > 0)
                groupQuery = groupQuery.Where(g => dto.GroupIds.Contains(g.Id));
            var groups = await groupQuery.ToListAsync();

            var alreadyScheduled = await _db.DefenseSchedules
                .Where(s => s.Phase == dto.Phase && s.Status != DefenseStatus.Cancelled)
                .Select(s => s.CapstoneGroupId)
                .ToListAsync();
            var alreadyScheduledSet = alreadyScheduled.ToHashSet();

            var candidates = new List<(Models.CapstoneGroup Group, List<string> People)>();
            foreach (var g in groups.OrderBy(g => g.GroupName))
            {
                if (alreadyScheduledSet.Contains(g.Id))
                {
                    // Only worth reporting when the Admin picked the group explicitly.
                    if (dto.GroupIds.Count > 0)
                        result.Unscheduled.Add(Skip(g, $"Already has a {PhaseLabel(dto.Phase)} scheduled."));
                    continue;
                }
                if (g.PanelMembers.Count == 0)
                {
                    result.Unscheduled.Add(Skip(g, "No panel members assigned to this group."));
                    continue;
                }
                if (dto.RequireReadiness && ReadinessProblem(g, dto.Phase) is { } problem)
                {
                    result.Unscheduled.Add(Skip(g, problem));
                    continue;
                }

                var people = g.PanelMembers.Select(p => p.PanelistId).Append(g.AdviserId).Distinct().ToList();
                candidates.Add((g, people));
            }

            // ── Slots ───────────────────────────────────────────────────────
            var nowUtc = DateTime.UtcNow;
            var slots = new List<Interval>();
            for (var day = dto.StartDate; day <= dto.EndDate; day = day.AddDays(1))
            {
                if (dto.SkipWeekends && day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
                // Minutes since midnight; the window is capped at 7 PM so this never wraps.
                var endMinute = dayEnd.Hour * 60 + dayEnd.Minute;
                for (var m = dayStart.Hour * 60 + dayStart.Minute;
                     m + dto.DurationMinutes <= endMinute;
                     m += dto.DurationMinutes + dto.BreakMinutes)
                {
                    var startUtc = PhilippineTime.ToUtc(day.ToDateTime(new TimeOnly(m / 60, m % 60)));
                    if (startUtc > nowUtc)
                        slots.Add(new Interval(startUtc, startUtc.AddMinutes(dto.DurationMinutes)));
                }
            }
            result.SlotsConsidered = slots.Count;
            if (slots.Count == 0)
            {
                result.Unscheduled.AddRange(candidates.Select(c => Skip(c.Group, "No available time slots in the chosen range.")));
                return result;
            }

            // ── Existing commitments ────────────────────────────────────────
            var windowStart = slots[0].Start.AddDays(-1);
            var windowEnd = slots[^1].End.AddDays(1);
            var existing = await _db.DefenseSchedules
                .Where(s => s.Status != DefenseStatus.Cancelled
                         && s.ScheduledDateTime < windowEnd
                         && s.ScheduledDateTime >= windowStart.AddHours(-12))
                .Select(s => new
                {
                    s.ScheduledDateTime,
                    s.DurationMinutes,
                    s.Venue,
                    AdviserId = s.CapstoneGroup.AdviserId,
                    Panelists = s.PanelAssignments.Select(pa => pa.PanelistId).ToList(),
                })
                .ToListAsync();

            var personBusy = new Dictionary<string, List<Interval>>();
            var venueBusy = new Dictionary<string, List<Interval>>(StringComparer.OrdinalIgnoreCase);
            foreach (var e in existing)
            {
                var interval = new Interval(e.ScheduledDateTime, e.ScheduledDateTime.AddMinutes(e.DurationMinutes));
                foreach (var person in e.Panelists.Append(e.AdviserId).Distinct())
                    Add(personBusy, person, interval);
                Add(venueBusy, e.Venue.Trim(), interval);
            }

            // ── Most-constrained-first placement ────────────────────────────
            var ordered = candidates
                .OrderByDescending(c => c.People.Count)
                .ThenByDescending(c => c.People.Sum(p => personBusy.TryGetValue(p, out var l) ? l.Count : 0))
                .ThenBy(c => c.Group.GroupName)
                .ToList();

            var usedDays = new HashSet<DateOnly>();
            foreach (var (group, people) in ordered)
            {
                Interval? chosen = null;
                string? chosenVenue = null;
                var blockedByDailyCap = false;

                foreach (var slot in slots)
                {
                    if (people.Any(p => personBusy.TryGetValue(p, out var busy) && busy.Any(slot.Overlaps)))
                        continue;

                    var phtDay = DateOnly.FromDateTime(slot.Start.AddHours(8));
                    if (people.Any(p => CountOnDay(personBusy, p, phtDay) >= dto.MaxDefensesPerFacultyPerDay))
                    {
                        blockedByDailyCap = true;
                        continue;
                    }

                    chosenVenue = venues.FirstOrDefault(v => !venueBusy.TryGetValue(v, out var busy) || !busy.Any(slot.Overlaps));
                    if (chosenVenue is null) continue;

                    chosen = slot;
                    break;
                }

                if (chosen is null)
                {
                    result.Unscheduled.Add(Skip(group, blockedByDailyCap
                        ? "Its panel or adviser already reached the daily defense limit on every open day. Widen the date range or raise the limit."
                        : "No slot where the whole panel, the adviser and a venue are all free. Widen the date range, add a venue, or lengthen the day."));
                    continue;
                }

                foreach (var p in people) Add(personBusy, p, chosen);
                Add(venueBusy, chosenVenue!, chosen);
                usedDays.Add(DateOnly.FromDateTime(chosen.Start.AddHours(8)));

                var panel = group.PanelMembers.OrderByDescending(p => p.IsChair).ToList();
                result.Proposals.Add(new ProposedDefenseDto
                {
                    GroupId = group.Id,
                    GroupName = group.GroupName,
                    ProjectTitle = group.ProjectTitle,
                    ScheduledDateTime = DateTime.SpecifyKind(chosen.Start, DateTimeKind.Utc),
                    DurationMinutes = dto.DurationMinutes,
                    Venue = chosenVenue!,
                    Phase = dto.Phase,
                    PanelistIds = panel.Select(p => p.PanelistId).ToList(),
                    PanelistNames = panel.Select(p => $"{p.Panelist.FirstName} {p.Panelist.LastName}".Trim() + (p.IsChair ? " (Chair)" : "")).ToList(),
                    AdviserName = $"{group.Adviser.FirstName} {group.Adviser.LastName}".Trim(),
                });
            }

            result.Proposals = result.Proposals.OrderBy(p => p.ScheduledDateTime).ThenBy(p => p.Venue).ToList();
            result.DaysUsed = usedDays.Count;
            return result;
        }

        public async Task<AutoScheduleConfirmResultDto> ConfirmAsync(ConfirmAutoScheduleRequestDto dto)
        {
            var result = new AutoScheduleConfirmResultDto();

            // Saved one at a time so each item is checked against everything saved before it,
            // including earlier items of this same batch.
            foreach (var item in dto.Items.OrderBy(i => i.ScheduledDateTime))
            {
                var group = await _db.CapstoneGroups
                    .Include(g => g.PanelMembers)
                    .FirstOrDefaultAsync(g => g.Id == item.GroupId);
                if (group is null)
                {
                    result.Failed.Add(new UnscheduledGroupDto { GroupId = item.GroupId, Reason = "Group no longer exists." });
                    continue;
                }

                var panelistIds = item.PanelistIds.Count > 0
                    ? item.PanelistIds.Distinct().ToList()
                    : group.PanelMembers.Select(p => p.PanelistId).ToList();
                var people = panelistIds.Append(group.AdviserId).Distinct().ToList();
                var start = DateTime.SpecifyKind(item.ScheduledDateTime, DateTimeKind.Utc);
                var end = start.AddMinutes(item.DurationMinutes);

                var conflict = await FindConflictAsync(start, end, item.Venue.Trim(), people);
                if (conflict is not null)
                {
                    result.Failed.Add(new UnscheduledGroupDto { GroupId = group.Id, GroupName = group.GroupName, Reason = conflict });
                    continue;
                }

                try
                {
                    result.Created.Add(await _defenses.CreateScheduleAsync(new CreateDefenseScheduleRequestDto
                    {
                        CapstoneGroupId = group.Id,
                        ScheduledDateTime = start,
                        DurationMinutes = item.DurationMinutes,
                        Venue = item.Venue.Trim(),
                        Phase = item.Phase,
                        PanelistIds = panelistIds,
                    }));
                }
                catch (InvalidOperationException ex)
                {
                    result.Failed.Add(new UnscheduledGroupDto { GroupId = group.Id, GroupName = group.GroupName, Reason = ex.Message });
                }
            }

            return result;
        }

        private async Task<string?> FindConflictAsync(DateTime start, DateTime end, string venue, List<string> people)
        {
            var overlapping = await _db.DefenseSchedules
                .Where(s => s.Status != DefenseStatus.Cancelled
                         && s.ScheduledDateTime < end
                         && s.ScheduledDateTime >= start.AddHours(-12))
                .Select(s => new
                {
                    s.ScheduledDateTime,
                    s.DurationMinutes,
                    s.Venue,
                    GroupName = s.CapstoneGroup.GroupName,
                    AdviserId = s.CapstoneGroup.AdviserId,
                    Panelists = s.PanelAssignments.Select(pa => pa.PanelistId).ToList(),
                })
                .ToListAsync();

            foreach (var s in overlapping.Where(s => s.ScheduledDateTime.AddMinutes(s.DurationMinutes) > start))
            {
                if (string.Equals(s.Venue.Trim(), venue, StringComparison.OrdinalIgnoreCase))
                    return $"{venue} is already booked for {s.GroupName} at that time.";
                if (s.Panelists.Append(s.AdviserId).Intersect(people).Any())
                    return $"A panelist or the adviser is already in {s.GroupName}'s defense at that time.";
            }
            return null;
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private static (TimeOnly Start, TimeOnly End) ParseWindow(string start, string end, int duration)
        {
            if (!TimeOnly.TryParseExact(start, ["HH:mm", "H:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var s) ||
                !TimeOnly.TryParseExact(end, ["HH:mm", "H:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var e))
                throw new InvalidOperationException("Day start and end must be times such as 08:00 and 17:00.");

            if (s < new TimeOnly(6, 0))
                throw new InvalidOperationException("Defenses cannot start before 6:00 AM.");
            if (e > new TimeOnly(19, 0))
                throw new InvalidOperationException("Defenses cannot extend past 7:00 PM.");
            if (s.AddMinutes(duration) > e || e <= s)
                throw new InvalidOperationException("The daily window is shorter than one defense.");
            return (s, e);
        }

        private static string? ReadinessProblem(Models.CapstoneGroup g, DefensePhase phase)
        {
            var approved = g.ChapterSubmissions
                .Where(c => c.Status == ChapterStatus.Approved)
                .Select(c => c.ChapterNumber)
                .Distinct()
                .Count();

            return phase switch
            {
                DefensePhase.ProposalDefense when approved < 3
                    => $"Not ready: {approved} of the 3 chapters needed for Proposal Defense are approved.",
                DefensePhase.FinalDefense when approved < 5
                    => $"Not ready: {approved} of the 5 chapters needed for Final Defense are approved.",
                DefensePhase.ReDefense when !g.RequiresReDefense
                    => "This group is not marked as requiring a re-defense.",
                _ => null,
            };
        }

        private static int CountOnDay(Dictionary<string, List<Interval>> busy, string person, DateOnly phtDay)
            => busy.TryGetValue(person, out var list)
                ? list.Count(i => DateOnly.FromDateTime(i.Start.AddHours(8)) == phtDay)
                : 0;

        private static void Add<TKey>(Dictionary<TKey, List<Interval>> map, TKey key, Interval interval) where TKey : notnull
        {
            if (!map.TryGetValue(key, out var list)) map[key] = list = [];
            list.Add(interval);
        }

        private static UnscheduledGroupDto Skip(Models.CapstoneGroup g, string reason)
            => new() { GroupId = g.Id, GroupName = g.GroupName, Reason = reason };

        private static string PhaseLabel(DefensePhase phase) => DefenseEmailTemplates.PhaseLabel(phase);
    }
}
