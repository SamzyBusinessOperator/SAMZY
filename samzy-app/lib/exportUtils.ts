import * as XLSX from "xlsx";

type ExcelRow = Record<string, unknown>;

type PdfCell = string | number | boolean | null;

export function exportToExcel(
  data: ExcelRow[],
  filename: string,
  sheetName: string,
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToPDF(
  title: string,
  headers: string[],
  rows: PdfCell[][],
  filename: string,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const document = new jsPDF();

  document.setFillColor(252, 120, 0);
  document.rect(0, 0, 210, 28, "F");

  document.setTextColor(255, 255, 255);
  document.setFontSize(16);
  document.setFont("helvetica", "bold");
  document.text(`SAMZY — ${title}`, 14, 16);

  document.setFontSize(9);
  document.setFont("helvetica", "normal");

  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  document.text(`Generated: ${generatedDate}`, 14, 24);

  const normalizedRows = rows.map((row) =>
    row.map((cell) => cell ?? ""),
  );

  autoTable(document, {
    head: [headers],
    body: normalizedRows,
    startY: 34,
    headStyles: {
      fillColor: [15, 15, 15],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 248],
    },
    styles: {
      cellPadding: 4,
    },
  });

  const pageCount = document.getNumberOfPages();
  const pageHeight = document.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setFontSize(8);
    document.setTextColor(150);

    document.text(
      `samzyai.com — Page ${page} of ${pageCount}`,
      14,
      pageHeight - 8,
    );
  }

  document.save(`${filename}.pdf`);
}