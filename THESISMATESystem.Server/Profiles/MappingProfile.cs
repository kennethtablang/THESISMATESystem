using AutoMapper;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Profiles
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<ApplicationUser, UserResponseDto>()
                .ForMember(d => d.Role, o => o.Ignore());

            CreateMap<ApplicationUser, UserSummaryDto>()
                .ForMember(d => d.FullName, o => o.MapFrom(s =>
                    string.IsNullOrWhiteSpace(s.MiddleName)
                        ? $"{s.FirstName} {s.LastName}".Trim()
                        : $"{s.FirstName} {s.MiddleName} {s.LastName}".Trim()));

            CreateMap<CapstoneGroup, CapstoneGroupResponseDto>()
                .ForMember(d => d.Members, o => o.MapFrom(s => s.Members.Select(m => m.User)))
                .ForMember(d => d.MilestoneProgress, o => o.Ignore())
                .ForMember(d => d.SystemLogoUrl, o => o.Ignore());

            CreateMap<ChapterSubmission, ChapterSubmissionResponseDto>();

            CreateMap<RevisionNote, RevisionNoteResponseDto>();

            CreateMap<ConsultationLog, ConsultationLogResponseDto>()
                .ForMember(d => d.GroupName, o => o.MapFrom(s => s.CapstoneGroup.GroupName));

            CreateMap<DefenseSchedule, DefenseScheduleResponseDto>()
                .ForMember(d => d.GroupName, o => o.MapFrom(s => s.CapstoneGroup.GroupName))
                .ForMember(d => d.AcademicYear, o => o.MapFrom(s => s.CapstoneGroup.AcademicYear))
                .ForMember(d => d.Panelists, o => o.MapFrom(s => s.PanelAssignments.Select(pa => pa.Panelist)))
                .ForMember(d => d.ConsolidatedRating, o => o.Ignore());

            CreateMap<DefenseCriterion, DefenseCriterionResponseDto>();

            CreateMap<DefenseRating, DefenseRatingResponseDto>()
                .ForMember(d => d.Criterion, o => o.MapFrom(s => s.DefenseCriterion))
                .ForMember(d => d.WeightedScore, o => o.MapFrom(s => s.Score * s.DefenseCriterion.Weight / 100));

            CreateMap<Notification, NotificationResponseDto>();

            CreateMap<Classroom, ClassroomResponseDto>()
                .ForMember(d => d.FacultyIC, o => o.MapFrom(s => s.FacultyIC))
                .ForMember(d => d.EnrollmentCount, o => o.MapFrom(s => s.Enrollments.Count));

            CreateMap<ClassroomAnnouncement, AnnouncementResponseDto>()
                .ForMember(d => d.PostedBy, o => o.MapFrom(s => s.PostedBy))
                .ForMember(d => d.TargetGroupName, o => o.MapFrom(s => s.TargetGroup != null ? s.TargetGroup.GroupName : null));

            CreateMap<ManuscriptSection, ManuscriptSectionResponseDto>()
                .ForMember(d => d.UpdatedBy, o => o.MapFrom(s => s.UpdatedBy))
                .ForMember(d => d.YjsState, o => o.MapFrom(s =>
                    s.YjsState != null ? Convert.ToBase64String(s.YjsState) : null));

            CreateMap<ManuscriptSectionComment, ManuscriptCommentDto>()
                .ForMember(d => d.Author, o => o.MapFrom(s => s.Author));
        }
    }
}
