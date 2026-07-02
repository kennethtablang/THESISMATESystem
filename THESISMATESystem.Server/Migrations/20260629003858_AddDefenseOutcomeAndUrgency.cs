using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddDefenseOutcomeAndUrgency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefenseOutcome",
                table: "CapstoneGroups",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RevisionLevel",
                table: "CapstoneGroups",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresReDefense",
                table: "CapstoneGroups",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Urgency",
                table: "SystemFeatures",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefenseOutcome",
                table: "CapstoneGroups");

            migrationBuilder.DropColumn(
                name: "RevisionLevel",
                table: "CapstoneGroups");

            migrationBuilder.DropColumn(
                name: "RequiresReDefense",
                table: "CapstoneGroups");

            migrationBuilder.DropColumn(
                name: "Urgency",
                table: "SystemFeatures");
        }
    }
}
