using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class FixDocumentVersioningCascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DocumentSubmissions_DocumentSubmissions_OriginalDocumentId",
                table: "DocumentSubmissions");

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

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentSubmissions_DocumentSubmissions_OriginalDocumentId",
                table: "DocumentSubmissions",
                column: "OriginalDocumentId",
                principalTable: "DocumentSubmissions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
