using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<CapstoneGroup> CapstoneGroups => Set<CapstoneGroup>();
        public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
        public DbSet<ChapterSubmission> ChapterSubmissions => Set<ChapterSubmission>();
        public DbSet<RevisionNote> RevisionNotes => Set<RevisionNote>();
        public DbSet<ConsultationLog> ConsultationLogs => Set<ConsultationLog>();
        public DbSet<DefenseSchedule> DefenseSchedules => Set<DefenseSchedule>();
        public DbSet<PanelAssignment> PanelAssignments => Set<PanelAssignment>();
        public DbSet<DefenseCriterion> DefenseCriteria => Set<DefenseCriterion>();
        public DbSet<DefenseRating> DefenseRatings => Set<DefenseRating>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        public DbSet<DocumentSubmission> DocumentSubmissions => Set<DocumentSubmission>();
        public DbSet<DocumentComment> DocumentComments => Set<DocumentComment>();
        public DbSet<SystemFeature> SystemFeatures => Set<SystemFeature>();
        public DbSet<SystemFeatureComment> SystemFeatureComments => Set<SystemFeatureComment>();
        public DbSet<SystemFeatureScreenshot> SystemFeatureScreenshots => Set<SystemFeatureScreenshot>();
        public DbSet<ConsultationSchedule> ConsultationSchedules => Set<ConsultationSchedule>();
        public DbSet<ConsultationRequest> ConsultationRequests => Set<ConsultationRequest>();
        public DbSet<Classroom> Classrooms => Set<Classroom>();
        public DbSet<ClassroomEnrollment> ClassroomEnrollments => Set<ClassroomEnrollment>();
        public DbSet<ClassroomAnnouncement> ClassroomAnnouncements => Set<ClassroomAnnouncement>();
        public DbSet<GroupDeadline> GroupDeadlines => Set<GroupDeadline>();
        public DbSet<ManuscriptSection> ManuscriptSections => Set<ManuscriptSection>();
        public DbSet<ManuscriptFinalizationVote> ManuscriptFinalizationVotes => Set<ManuscriptFinalizationVote>();
        public DbSet<ManuscriptSnapshot> ManuscriptSnapshots => Set<ManuscriptSnapshot>();
        public DbSet<ManuscriptSectionComment> ManuscriptSectionComments => Set<ManuscriptSectionComment>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<CapstoneGroup>()
                .HasOne(g => g.Adviser)
                .WithMany(u => u.AdvisedGroups)
                .HasForeignKey(g => g.AdviserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<GroupMember>()
                .HasIndex(gm => new { gm.CapstoneGroupId, gm.UserId })
                .IsUnique();

            builder.Entity<GroupMember>()
                .HasOne(gm => gm.User)
                .WithMany(u => u.GroupMemberships)
                .HasForeignKey(gm => gm.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ChapterSubmission>()
                .HasOne(cs => cs.SubmittedBy)
                .WithMany()
                .HasForeignKey(cs => cs.SubmittedById)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<RevisionNote>()
                .HasOne(rn => rn.CreatedBy)
                .WithMany()
                .HasForeignKey(rn => rn.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ConsultationLog>()
                .HasOne(cl => cl.Adviser)
                .WithMany(u => u.ConsultationLogs)
                .HasForeignKey(cl => cl.AdviserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ConsultationLog>()
                .HasOne(cl => cl.ChapterSubmission)
                .WithMany()
                .HasForeignKey(cl => cl.ChapterSubmissionId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<PanelAssignment>()
                .HasIndex(pa => new { pa.DefenseScheduleId, pa.PanelistId })
                .IsUnique();

            builder.Entity<PanelAssignment>()
                .HasOne(pa => pa.Panelist)
                .WithMany(u => u.PanelAssignments)
                .HasForeignKey(pa => pa.PanelistId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<DefenseRating>()
                .HasIndex(dr => new { dr.DefenseScheduleId, dr.DefenseCriterionId, dr.PanelistId })
                .IsUnique();

            builder.Entity<DefenseRating>()
                .HasOne(dr => dr.Panelist)
                .WithMany()
                .HasForeignKey(dr => dr.PanelistId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<DefenseRating>()
                .Property(dr => dr.Score)
                .HasPrecision(5, 2);

            builder.Entity<DefenseCriterion>()
                .Property(dc => dc.Weight)
                .HasPrecision(5, 2);

            builder.Entity<AuditLog>()
                .HasOne(al => al.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(al => al.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Document submissions
            builder.Entity<DocumentSubmission>()
                .HasOne(ds => ds.SubmittedBy)
                .WithMany(u => u.DocumentSubmissions)
                .HasForeignKey(ds => ds.SubmittedById)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<DocumentSubmission>()
                .HasOne(d => d.OriginalDocument)
                .WithMany()
                .HasForeignKey(d => d.OriginalDocumentId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            builder.Entity<DocumentComment>()
                .HasOne(dc => dc.Author)
                .WithMany(u => u.DocumentComments)
                .HasForeignKey(dc => dc.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<DocumentComment>()
                .HasOne(dc => dc.DocumentSubmission)
                .WithMany(ds => ds.Comments)
                .HasForeignKey(dc => dc.DocumentSubmissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // System features
            builder.Entity<SystemFeatureComment>()
                .HasOne(sfc => sfc.Author)
                .WithMany(u => u.SystemFeatureComments)
                .HasForeignKey(sfc => sfc.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<SystemFeatureComment>()
                .HasOne(sfc => sfc.SystemFeature)
                .WithMany(sf => sf.Comments)
                .HasForeignKey(sfc => sfc.SystemFeatureId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<SystemFeatureScreenshot>()
                .HasOne(s => s.SystemFeature)
                .WithMany(sf => sf.Screenshots)
                .HasForeignKey(s => s.SystemFeatureId)
                .OnDelete(DeleteBehavior.Cascade);

            // Consultation schedules
            builder.Entity<ConsultationSchedule>()
                .HasOne(cs => cs.FacultyIC)
                .WithMany(u => u.ConsultationSchedules)
                .HasForeignKey(cs => cs.FacultyICId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ConsultationRequest>()
                .HasOne(cr => cr.RequestedBy)
                .WithMany(u => u.ConsultationRequests)
                .HasForeignKey(cr => cr.RequestedById)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ConsultationRequest>()
                .HasOne(cr => cr.ConsultationSchedule)
                .WithMany(cs => cs.Requests)
                .HasForeignKey(cr => cr.ConsultationScheduleId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ConsultationRequest>()
                .HasOne(cr => cr.CapstoneGroup)
                .WithMany()
                .HasForeignKey(cr => cr.CapstoneGroupId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ConsultationRequest>()
                .HasIndex(cr => new { cr.ConsultationScheduleId, cr.CapstoneGroupId })
                .IsUnique();

            // Classroom
            builder.Entity<Classroom>()
                .HasOne(c => c.FacultyIC)
                .WithMany()
                .HasForeignKey(c => c.FacultyICId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Classroom>()
                .HasIndex(c => c.JoinCode)
                .IsUnique();

            builder.Entity<ClassroomEnrollment>()
                .HasIndex(ce => new { ce.ClassroomId, ce.StudentId })
                .IsUnique();

            builder.Entity<ClassroomEnrollment>()
                .HasOne(ce => ce.Student)
                .WithMany(u => u.ClassroomEnrollments)
                .HasForeignKey(ce => ce.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ClassroomEnrollment>()
                .HasOne(ce => ce.Classroom)
                .WithMany(c => c.Enrollments)
                .HasForeignKey(ce => ce.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ClassroomAnnouncement>()
                .HasOne(a => a.PostedBy)
                .WithMany()
                .HasForeignKey(a => a.PostedById)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ClassroomAnnouncement>()
                .HasOne(a => a.Classroom)
                .WithMany(c => c.Announcements)
                .HasForeignKey(a => a.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ClassroomAnnouncement>()
                .HasOne(a => a.TargetGroup)
                .WithMany()
                .HasForeignKey(a => a.TargetGroupId)
                .OnDelete(DeleteBehavior.SetNull);

            // Manuscript sections — one record per group per section key
            builder.Entity<ManuscriptSection>()
                .HasIndex(ms => new { ms.CapstoneGroupId, ms.SectionKey })
                .IsUnique();

            builder.Entity<ManuscriptSection>()
                .HasOne(ms => ms.CapstoneGroup)
                .WithMany()
                .HasForeignKey(ms => ms.CapstoneGroupId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ManuscriptSection>()
                .HasOne(ms => ms.UpdatedBy)
                .WithMany()
                .HasForeignKey(ms => ms.UpdatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Finalization votes — one per user per revision per group
            builder.Entity<ManuscriptFinalizationVote>()
                .HasIndex(v => new { v.CapstoneGroupId, v.UserId, v.Revision })
                .IsUnique();

            builder.Entity<ManuscriptFinalizationVote>()
                .HasOne(v => v.CapstoneGroup)
                .WithMany()
                .HasForeignKey(v => v.CapstoneGroupId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ManuscriptFinalizationVote>()
                .HasOne(v => v.User)
                .WithMany()
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Manuscript snapshots
            builder.Entity<ManuscriptSnapshot>()
                .HasOne(s => s.CapstoneGroup)
                .WithMany()
                .HasForeignKey(s => s.CapstoneGroupId)
                .OnDelete(DeleteBehavior.Cascade);

            // Section comments
            builder.Entity<ManuscriptSectionComment>()
                .HasOne(c => c.CapstoneGroup)
                .WithMany()
                .HasForeignKey(c => c.CapstoneGroupId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ManuscriptSectionComment>()
                .HasOne(c => c.Author)
                .WithMany()
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
