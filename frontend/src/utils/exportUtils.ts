import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';

// Interface untuk data analytics
interface AnalyticsData {
  summary: {
    period: string;
    labels: string[];
    points: {
      pointsUsedSeries: number[];
      pointsRedeemedSeries: number[];
    };
    vouchers: {
      vouchersIssuedSeries: number[];
      vouchersRedeemedSeries: number[];
    };
    redeem: {
      redeemTotalSeries: number[];
    };
  } | null;
  members: {
    period: string;
    labels: string[];
    members: {
      newJoinSeries: number[];
      activeMembersSeries: number[];
      eventParticipationSeries: number[];
    };
  } | null;
  promos: {
    period: string;
    labels: string[];
    usedSeries: number[];
    viewsSeries: number[];
    byPromo: Array<{
      promoId: string;
      title: string;
      type: string;
      usedCount: number;
    }>;
  } | null;
  tickets: {
    period: string;
    labels: string[];
    tourism: {
      salesSeries: number[];
      revenueSeries: number[];
      totalSales: number;
      totalRevenue: number;
      topTickets: Array<{
        title: string;
        sales: number;
        revenue: number;
        quantity: number;
      }>;
    };
    accommodation: {
      salesSeries: number[];
      revenueSeries: number[];
      totalSales: number;
      totalRevenue: number;
      topAccommodations: Array<{
        name: string;
        sales: number;
        revenue: number;
        rooms: number;
        guests: number;
      }>;
    };
    combined: {
      totalSales: number;
      totalRevenue: number;
      salesSeries: number[];
      revenueSeries: number[];
    };
  } | null;
}

// Utility function untuk format angka
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num);
};

// Utility function untuk format mata uang
const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Export ke PDF
export const exportToPDF = async (data: AnalyticsData, period: string) => {
  try {
    // Buat elemen HTML sementara untuk konten PDF
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';

    // Generate HTML content
    const periodText = period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan';
    const currentDate = new Date().toLocaleDateString('id-ID');

    tempDiv.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin-bottom: 10px;">Analytics Dashboard</h1>
        <h2 style="color: #6b7280; margin-bottom: 5px;">The Lodge Family</h2>
        <p style="color: #9ca3af; margin: 0;">Periode: ${periodText} | Tanggal Export: ${currentDate}</p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Ringkasan Utama</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
          ${data.members ? `
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <h4 style="color: #3b82f6; margin: 0 0 10px 0;">Member Baru</h4>
              <p style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">
                ${formatNumber(data.members.members.newJoinSeries.reduce((a, b) => a + b, 0))}
              </p>
            </div>
          ` : ''}
          ${data.summary ? `
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <h4 style="color: #f59e0b; margin: 0 0 10px 0;">Points Diredem</h4>
              <p style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">
                ${formatNumber(data.summary.points.pointsUsedSeries.reduce((a, b) => a + b, 0))}
              </p>
            </div>
          ` : ''}
          ${data.tickets ? `
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <h4 style="color: #10b981; margin: 0 0 10px 0;">Total Penjualan Tiket</h4>
              <p style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">
                ${formatNumber(data.tickets.combined.totalSales)}
              </p>
            </div>
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <h4 style="color: #8b5cf6; margin: 0 0 10px 0;">Total Pendapatan</h4>
              <p style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">
                ${formatCurrency(data.tickets.combined.totalRevenue)}
              </p>
            </div>
          ` : ''}
        </div>
      </div>

      ${data.tickets ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Top Tiket Wisata</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Nama Tiket</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Penjualan</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Pendapatan</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${data.tickets.tourism.topTickets.slice(0, 5).map(ticket => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 12px;">${ticket.title}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${formatNumber(ticket.sales)}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${formatCurrency(ticket.revenue)}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${formatNumber(ticket.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Top Akomodasi</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Nama Akomodasi</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Booking</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Pendapatan</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Kamar</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Tamu</th>
              </tr>
            </thead>
            <tbody>
              ${data.tickets.accommodation.topAccommodations.slice(0, 5).map(acc => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 12px;">${acc.name}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${formatNumber(acc.sales)}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${formatCurrency(acc.revenue)}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${formatNumber(acc.rooms)}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${formatNumber(acc.guests)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${data.promos ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Top Promo</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Judul Promo</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Tipe</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Digunakan</th>
              </tr>
            </thead>
            <tbody>
              ${data.promos.byPromo.sort((a, b) => b.usedCount - a.usedCount).slice(0, 5).map(promo => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 12px;">${promo.title}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-transform: capitalize;">${promo.type.replace('_', ' ')}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${formatNumber(promo.usedCount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;

    document.body.appendChild(tempDiv);

    // Convert to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Remove temporary element
    document.body.removeChild(tempDiv);

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    // Save PDF
    const fileName = `analytics-${periodText.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Gagal mengexport PDF');
  }
};

// Export ke CSV
export const exportToCSV = (data: AnalyticsData, period: string) => {
  try {
    const periodText = period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan';
    const csvData: any[] = [];

    // Header informasi
    csvData.push(['Analytics Dashboard - The Lodge Family']);
    csvData.push([`Periode: ${periodText}`]);
    csvData.push([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`]);
    csvData.push([]);

    // Ringkasan Utama
    csvData.push(['=== RINGKASAN UTAMA ===']);
    if (data.members) {
      csvData.push(['Member Baru', formatNumber(data.members.members.newJoinSeries.reduce((a, b) => a + b, 0))]);
    }
    if (data.summary) {
      csvData.push(['Points Diredem', formatNumber(data.summary.points.pointsUsedSeries.reduce((a, b) => a + b, 0))]);
      csvData.push(['Voucher Diterbitkan', formatNumber(data.summary.vouchers.vouchersIssuedSeries.reduce((a, b) => a + b, 0))]);
      csvData.push(['Voucher Diredem', formatNumber(data.summary.vouchers.vouchersRedeemedSeries.reduce((a, b) => a + b, 0))]);
    }
    if (data.tickets) {
      csvData.push(['Total Penjualan Tiket', formatNumber(data.tickets.combined.totalSales)]);
      csvData.push(['Total Pendapatan', formatCurrency(data.tickets.combined.totalRevenue)]);
    }
    csvData.push([]);

    // Data Member per Periode
    if (data.members) {
      csvData.push(['=== DATA MEMBER PER PERIODE ===']);
      csvData.push(['Periode', 'Member Baru', 'Member Aktif', 'Partisipasi Event']);
      data.members.labels.forEach((label, index) => {
        csvData.push([
          label,
          data.members!.members.newJoinSeries[index],
          data.members!.members.activeMembersSeries[index],
          data.members!.members.eventParticipationSeries[index]
        ]);
      });
      csvData.push([]);
    }

    // Data Points per Periode
    if (data.summary) {
      csvData.push(['=== DATA POINTS PER PERIODE ===']);
      csvData.push(['Periode', 'Points Digunakan', 'Points Diredem']);
      data.summary.labels.forEach((label, index) => {
        csvData.push([
          label,
          data.summary!.points.pointsUsedSeries[index],
          data.summary!.points.pointsRedeemedSeries[index]
        ]);
      });
      csvData.push([]);
    }

    // Data Tiket per Periode
    if (data.tickets) {
      csvData.push(['=== DATA TIKET PER PERIODE ===']);
      csvData.push(['Periode', 'Penjualan Tiket', 'Pendapatan Tiket']);
      data.tickets.labels.forEach((label, index) => {
        csvData.push([
          label,
          data.tickets!.combined.salesSeries[index],
          data.tickets!.combined.revenueSeries[index]
        ]);
      });
      csvData.push([]);

      // Top Tiket Wisata
      csvData.push(['=== TOP TIKET WISATA ===']);
      csvData.push(['Nama Tiket', 'Penjualan', 'Pendapatan', 'Quantity']);
      data.tickets.tourism.topTickets.forEach(ticket => {
        csvData.push([ticket.title, ticket.sales, ticket.revenue, ticket.quantity]);
      });
      csvData.push([]);

      // Top Akomodasi
      csvData.push(['=== TOP AKOMODASI ===']);
      csvData.push(['Nama Akomodasi', 'Booking', 'Pendapatan', 'Kamar', 'Tamu']);
      data.tickets.accommodation.topAccommodations.forEach(acc => {
        csvData.push([acc.name, acc.sales, acc.revenue, acc.rooms, acc.guests]);
      });
      csvData.push([]);
    }

    // Data Promo
    if (data.promos) {
      csvData.push(['=== DATA PROMO ===']);
      csvData.push(['Judul Promo', 'Tipe', 'Digunakan']);
      data.promos.byPromo
        .sort((a, b) => b.usedCount - a.usedCount)
        .forEach(promo => {
          csvData.push([promo.title, promo.type.replace('_', ' '), promo.usedCount]);
        });
    }

    // Convert to CSV
    const csv = Papa.unparse(csvData);
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-${periodText.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error('Gagal mengexport CSV');
  }
};