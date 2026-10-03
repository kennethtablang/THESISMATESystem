using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddPreFinalDefenseAndReDefenseOf : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReDefenseOf",
                table: "DefenseSchedules",
                type: "int",
                nullable: true);

            // DefensePhase gained PreFinalDefense = 2, so the stored FinalDefense (2) and
            // ReDefense (3) values move up by one. Highest first so the two shifts never collide.
            foreach (var table in new[] { "DefenseSchedules", "DefenseCriteria" })
            {
                migrationBuilder.Sql($"UPDATE [{table}] SET [Phase] = 4 WHERE [Phase] = 3;");
                migrationBuilder.Sql($"UPDATE [{table}] SET [Phase] = 3 WHERE [Phase] = 2;");
            }

            // Re-defenses scheduled before this change were all re-takes of the Final Defense.
            migrationBuilder.Sql("UPDATE [DefenseSchedules] SET [ReDefenseOf] = 3 WHERE [Phase] = 4;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Pre-Final Defense has no slot in the old numbering; drop its rows before shifting back.
            migrationBuilder.Sql("DELETE FROM [DefenseRatings] WHERE [DefenseScheduleId] IN (SELECT [Id] FROM [DefenseSchedules] WHERE [Phase] = 2);");
            migrationBuilder.Sql("DELETE FROM [PanelAssignments] WHERE [DefenseScheduleId] IN (SELECT [Id] FROM [DefenseSchedules] WHERE [Phase] = 2);");
            migrationBuilder.Sql("DELETE FROM [DefenseSchedules] WHERE [Phase] = 2;");
            migrationBuilder.Sql("DELETE FROM [DefenseRatings] WHERE [DefenseCriterionId] IN (SELECT [Id] FROM [DefenseCriteria] WHERE [Phase] = 2);");
            migrationBuilder.Sql("DELETE FROM [DefenseCriteria] WHERE [Phase] = 2;");
            foreach (var table in new[] { "DefenseSchedules", "DefenseCriteria" })
            {
                migrationBuilder.Sql($"UPDATE [{table}] SET [Phase] = 2 WHERE [Phase] = 3;");
                migrationBuilder.Sql($"UPDATE [{table}] SET [Phase] = 3 WHERE [Phase] = 4;");
            }

            migrationBuilder.DropColumn(
                name: "ReDefenseOf",
                table: "DefenseSchedules");
        }
    }
}
