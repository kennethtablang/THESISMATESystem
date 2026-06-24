using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddVersionToCapstoneGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ManuscriptVersion",
                table: "CapstoneGroups",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SystemVersion",
                table: "CapstoneGroups",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManuscriptVersion",
                table: "CapstoneGroups");

            migrationBuilder.DropColumn(
                name: "SystemVersion",
                table: "CapstoneGroups");
        }
    }
}
