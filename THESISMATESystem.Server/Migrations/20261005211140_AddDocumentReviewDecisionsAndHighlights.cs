using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentReviewDecisionsAndHighlights : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Prefix",
                table: "DocumentComments",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Quote",
                table: "DocumentComments",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DocumentReviewDecisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocumentSubmissionId = table.Column<int>(type: "int", nullable: false),
                    ReviewerId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ReviewedVersion = table.Column<int>(type: "int", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentReviewDecisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentReviewDecisions_AspNetUsers_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DocumentReviewDecisions_DocumentSubmissions_DocumentSubmissionId",
                        column: x => x.DocumentSubmissionId,
                        principalTable: "DocumentSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentReviewDecisions_DocumentSubmissionId_ReviewerId",
                table: "DocumentReviewDecisions",
                columns: new[] { "DocumentSubmissionId", "ReviewerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentReviewDecisions_ReviewerId",
                table: "DocumentReviewDecisions",
                column: "ReviewerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentReviewDecisions");

            migrationBuilder.DropColumn(
                name: "Prefix",
                table: "DocumentComments");

            migrationBuilder.DropColumn(
                name: "Quote",
                table: "DocumentComments");
        }
    }
}
