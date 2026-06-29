using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentSubmissionStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SubmissionStatus",
                table: "DocumentSubmissions",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SubmissionStatus",
                table: "DocumentSubmissions");
        }
    }
}
