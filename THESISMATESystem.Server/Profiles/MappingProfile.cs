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
                .ForMember(d => d.FullName, o => o.MapFrom(s => $"{s.FirstName} {s.LastName}"));

            CreateMap<CapstoneGroup, CapstoneGroupResponseDto>()
                .ForMember(d => d.Members, o => o.MapFrom(s => s.Members.Select(m => m.User)))
                .ForMember(d => d.MilestoneProgress, o => o.Ignore());

            CreateMap<ChapterSubmission, ChapterSubmissionResponseDto>();

            CreateMap<RevisionNote, RevisionNoteResponseDto>();

            CreateMap<ConsultationLog, ConsultationLogResponseDto>()
                .ForMember(d => d.GroupName, o => o.MapFrom(s => s.CapstoneGroup.GroupName));

            CreateMap<DefenseSchedule, DefenseScheduleResponseDto>()
                .ForMember(d => d.GroupName, o => o.MapFrom(s => s.CapstoneGroup.GroupName))
                .ForMember(d => d.Panelists, o => o.MapFrom(s => s.PanelAssignments.Select(pa => pa.Panelist)))
                .ForMember(d => d.ConsolidatedRating, o => o.Ignore());

            CreateMap<DefenseCriterion, DefenseCriterionResponseDto>();

            CreateMap<DefenseRating, DefenseRatingResponseDto>()
                .ForMember(d => d.Criterion, o => o.MapFrom(s => s.DefenseCriterion))
                .ForMember(d => d.WeightedScore, o => o.MapFrom(s => s.Score * s.DefenseCriterion.Weight / 100));

            CreateMap<Notification, NotificationResponseDto>();
        }
    }
}
