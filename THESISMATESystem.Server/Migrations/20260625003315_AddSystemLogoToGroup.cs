using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemLogoToGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SystemLogoPath was manually applied to the DB before this migration was tracked.
            // Only add OriginalDocumentId here.
            migrationBuilder.AddColumn<int>(
                name: "OriginalDocumentId",
                table: "DocumentSubmissions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSubmissions_OriginalDocumentId",
                table: "DocumentSubmissions",
                column: "OriginalDocumentId");

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentSubmissions_DocumentSubmissions_OriginalDocumentId",
                table: "DocumentSubmissions",
                column: "OriginalDocumentId",
                principalTable: "DocumentSubmissions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DocumentSubmissions_DocumentSubmissions_OriginalDocumentId",
                table: "DocumentSubmissions");

            migrationBuilder.DropIndex(
                name: "IX_DocumentSubmissions_OriginalDocumentId",
                table: "DocumentSubmissions");

            migrationBuilder.DropColumn(
                name: "OriginalDocumentId",
                table: "DocumentSubmissions");
        }
    }
}
