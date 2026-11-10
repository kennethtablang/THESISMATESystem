using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class Revision8RevisionItemsComplianceMatrix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRevisionItem",
                table: "DocumentComments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsStatusNote",
                table: "DocumentComments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResolvedAt",
                table: "DocumentComments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolvedById",
                table: "DocumentComments",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AdviserId",
                table: "CapstoneGroups",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateTable(
                name: "DefenseRecommendations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DefenseScheduleId = table.Column<int>(type: "int", nullable: false),
                    AuthorId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Recommendation = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Initials = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DefenseRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DefenseRecommendations_AspNetUsers_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DefenseRecommendations_DefenseSchedules_DefenseScheduleId",
                        column: x => x.DefenseScheduleId,
                        principalTable: "DefenseSchedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentComments_ResolvedById",
                table: "DocumentComments",
                column: "ResolvedById");

            migrationBuilder.CreateIndex(
                name: "IX_DefenseRecommendations_AuthorId",
                table: "DefenseRecommendations",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_DefenseRecommendations_DefenseScheduleId",
                table: "DefenseRecommendations",
                column: "DefenseScheduleId");

            // The client used to post the decision line itself; mark those as status notes.
            migrationBuilder.Sql(@"
UPDATE DocumentComments SET IsStatusNote = 1
WHERE Content IN (N'This document has been approved.', N'This document has been sent back for further revisions.');");

            // A reviewer's other comments on a version they sent back are that round's revision items.
            migrationBuilder.Sql(@"
UPDATE c SET IsRevisionItem = 1
FROM DocumentComments c
WHERE c.IsStatusNote = 0
  AND EXISTS (SELECT 1 FROM DocumentComments n
              WHERE n.DocumentSubmissionId = c.DocumentSubmissionId
                AND n.AuthorId = c.AuthorId
                AND n.IsStatusNote = 1
                AND n.Content = N'This document has been sent back for further revisions.')
  AND EXISTS (SELECT 1 FROM DocumentReviewDecisions r
              JOIN DocumentSubmissions d ON d.Id = c.DocumentSubmissionId
              WHERE r.DocumentSubmissionId = COALESCE(d.OriginalDocumentId, d.Id)
                AND r.ReviewerId = c.AuthorId);");

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentComments_AspNetUsers_ResolvedById",
                table: "DocumentComments",
                column: "ResolvedById",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DocumentComments_AspNetUsers_ResolvedById",
                table: "DocumentComments");

            migrationBuilder.DropTable(
                name: "DefenseRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_DocumentComments_ResolvedById",
                table: "DocumentComments");

            migrationBuilder.DropColumn(
                name: "IsRevisionItem",
                table: "DocumentComments");

            migrationBuilder.DropColumn(
                name: "IsStatusNote",
                table: "DocumentComments");

            migrationBuilder.DropColumn(
                name: "ResolvedAt",
                table: "DocumentComments");

            migrationBuilder.DropColumn(
                name: "ResolvedById",
                table: "DocumentComments");

            migrationBuilder.AlterColumn<string>(
                name: "AdviserId",
                table: "CapstoneGroups",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);
        }
    }
}
