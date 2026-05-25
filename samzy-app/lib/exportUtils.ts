import * as XLSX from "xlsx";

export function exportToExcel(data: any[], filename: string, sheetName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(title: string, headers: string[], rows: any[][], filename: string) {
  import("jspdf").then(({ default: jsPDF }) => {
    import("jspdf-autotable").then(({ default: autoTable }) => {
      const doc = new jsPDF() as any;

      // Orange header bar
      doc.setFillColor(252, 120, 0);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Samzy — " + title, 14, 16);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Generated: " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), 14, 24);

      // Table using autoTable directly
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 34,
        headStyles: { fillColor: [15, 15, 15], textColor: 255, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [250, 250, 248] },
        styles: { cellPadding: 4 },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`samzyai.com — Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 8);
      }

      doc.save(`${filename}.pdf`);
    });
  });
}
