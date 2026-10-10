import { SIGN_ABBR, AYANAMSA_LABEL } from './constants';
import { formatDate, formatDegrees, bodyLabel } from './format';
import type { Chart, Position } from './types';
import { HOUSES } from './components/NorthIndianChart';
import { GRID } from './components/SouthIndianChart';

export interface ExportChartOptions {
  chart: Chart;
  division: string;
  divisionName: string;
  style: 'north' | 'south';
}

/**
 * Exports a high-resolution, professional Vedic Kundli PNG using an HTML5 Canvas.
 * This completely avoids html-to-image / DOM-cloning issues that cause blank images,
 * works reliably across all browsers and devices, and produces a print-ready Kundli.
 */
export async function downloadChartAsPng({
  chart,
  division,
  divisionName,
  style,
}: ExportChartOptions): Promise<void> {
  const { birthDetails: b, ascendant } = chart;
  const moon = chart.planets.find((p) => p.name === 'Moon');
  const sun = chart.planets.find((p) => p.name === 'Sun');

  // Canvas Dimensions (Ultra-crisp 1200 x 1460)
  const width = 1200;
  const height = 1460;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context could not be created.');

  // 1. Deep Midnight Cosmic Background
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 900);
  bgGrad.addColorStop(0, '#15193d');
  bgGrad.addColorStop(0.65, '#0d0f28');
  bgGrad.addColorStop(1, '#060714');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle star dots in background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  const starSeeds = [
    [120, 80], [280, 140], [920, 90], [1080, 160], [140, 1340], [1050, 1370],
    [90, 720], [1110, 760], [240, 1400], [880, 1420], [1030, 480], [160, 490]
  ];
  for (const [sx, sy] of starSeeds) {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Ornate Vedic Gold Borders
  ctx.strokeStyle = '#5a461e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  ctx.strokeStyle = '#e2b857';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // Corner decorative flourishes
  const drawCornerFlourish = (cx: number, cy: number, flipX: boolean, flipY: boolean) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.strokeStyle = '#e2b857';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(24, 0);
    ctx.lineTo(24, 24);
    ctx.lineTo(0, 24);
    ctx.lineTo(0, 10);
    ctx.stroke();

    ctx.fillStyle = '#e2b857';
    ctx.beginPath();
    ctx.arc(12, 12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawCornerFlourish(40, 40, false, false);
  drawCornerFlourish(width - 40, 40, true, false);
  drawCornerFlourish(40, height - 40, false, true);
  drawCornerFlourish(width - 40, height - 40, true, true);

  // 3. Header Section
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtitle / Brand
  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#bfa15f';
  ctx.fillText('NEXTGENASTRO  ·  VEDIC BIRTH KUNDLI', width / 2, 75);

  // Native's Name
  ctx.font = 'bold 36px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#ffffff';
  const displayName = b.name && b.name.trim() ? b.name.trim() : 'Vedic Birth Chart';
  ctx.fillText(displayName, width / 2, 120);

  // Birth Details Line
  ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#c5c8e2';
  const birthLine = `${formatDate(b.date)}  ·  ${b.localTime} (UTC${b.utcOffset})  ·  ${b.placeName}`;
  ctx.fillText(birthLine, width / 2, 158);

  // Chart Division / Style Pill Banner
  const chartBannerText = `${divisionName.toUpperCase()} (${division})  ·  ${style === 'north' ? 'NORTH INDIAN' : 'SOUTH INDIAN'} STYLE`;
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const bannerWidth = ctx.measureText(chartBannerText).width + 36;
  ctx.fillStyle = 'rgba(226, 184, 87, 0.14)';
  ctx.strokeStyle = 'rgba(226, 184, 87, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(width / 2 - bannerWidth / 2, 182, bannerWidth, 30, 15);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f3ca6d';
  ctx.fillText(chartBannerText, width / 2, 197);

  // 4. Chart Drawing (Center area)
  // Chart is 720 x 720 centered at (240, 240)
  const chartSize = 720;
  const chartLeft = (width - chartSize) / 2;
  const chartTop = 236;
  const scale = chartSize / 400;

  const allBodies: Position[] = [chart.ascendant, ...chart.planets];

  if (style === 'north') {
    // --- North Indian Chart Drawing ---
    // Background for chart area
    ctx.fillStyle = '#101332';
    ctx.fillRect(chartLeft, chartTop, chartSize, chartSize);

    HOUSES.forEach((h, i) => {
      const houseNumber = i + 1;
      const signNumber = ((chart.ascendant.signNumber - 1 + i) % 12) + 1;
      const points = h.points.split(' ').map((p) => {
        const [px, py] = p.split(',').map(Number);
        return [chartLeft + px * scale, chartTop + py * scale] as [number, number];
      });

      // House fill
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let pIdx = 1; pIdx < points.length; pIdx++) {
        ctx.lineTo(points[pIdx][0], points[pIdx][1]);
      }
      ctx.closePath();

      if (houseNumber === 1) {
        // Lagna House 1 Highlight
        ctx.fillStyle = 'rgba(226, 184, 87, 0.18)';
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fill();
      }

      // House border
      ctx.strokeStyle = houseNumber === 1 ? '#d6ab4e' : '#8f7033';
      ctx.lineWidth = houseNumber === 1 ? 2.8 : 2.0;
      ctx.stroke();

      // Sign number
      const signX = chartLeft + h.sign[0] * scale;
      const signY = chartTop + h.sign[1] * scale;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.fillStyle = '#b8bacf';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(signNumber), signX, signY);

      // Planets in this house
      const bodiesInHouse = allBodies.filter((p) => p.house === houseNumber);
      if (bodiesInHouse.length > 0) {
        const bodyX = chartLeft + h.body[0] * scale;
        const bodyY = chartTop + h.body[1] * scale;

        // Group into rows of 2
        const rows: Position[][] = [];
        for (let b = 0; b < bodiesInHouse.length; b += 2) {
          rows.push(bodiesInHouse.slice(b, b + 2));
        }
        const lineHeight = 24;
        const startY = bodyY - ((rows.length - 1) * lineHeight) / 2;

        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        rows.forEach((row, rIdx) => {
          const rowY = startY + rIdx * lineHeight;
          const labels = row.map((body) => {
            const lbl = bodyLabel(body);
            return body.name === 'Ascendant' ? 'Asc' : lbl;
          });
          const rowText = labels.join('  ');

          ctx.fillStyle = '#ffffff';
          ctx.fillText(rowText, bodyX, rowY);
        });
      }
    });

    // Outer chart border
    ctx.strokeStyle = '#e2b857';
    ctx.lineWidth = 3;
    ctx.strokeRect(chartLeft, chartTop, chartSize, chartSize);

  } else {
    // --- South Indian Chart Drawing ---
    const cell = (chartSize / 4);
    ctx.fillStyle = '#101332';
    ctx.fillRect(chartLeft, chartTop, chartSize, chartSize);

    GRID.forEach(([col, row], signIndex) => {
      const x = chartLeft + col * cell;
      const y = chartTop + row * cell;
      const signNumber = signIndex + 1;
      const isAsc = chart.ascendant.signNumber === signNumber;

      // Cell Fill
      ctx.fillStyle = isAsc ? 'rgba(226, 184, 87, 0.22)' : 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(x, y, cell, cell);

      // Cell Border
      ctx.strokeStyle = isAsc ? '#e2b857' : '#8f7033';
      ctx.lineWidth = isAsc ? 2.8 : 2.0;
      ctx.strokeRect(x, y, cell, cell);

      // Sign abbreviation in corner
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = isAsc ? '#e2b857' : '#9ca0ba';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(SIGN_ABBR[signIndex], x + 10, y + 10);

      if (isAsc) {
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#f3ca6d';
        ctx.textAlign = 'right';
        ctx.fillText('ASC', x + cell - 10, y + 10);
      }

      // Planets in this sign
      const bodiesInSign = allBodies.filter((p) => p.signNumber === signNumber);
      if (bodiesInSign.length > 0) {
        const bodyCenterX = x + cell / 2;
        const bodyCenterY = y + cell / 2 + 8;

        const rows: Position[][] = [];
        for (let b = 0; b < bodiesInSign.length; b += 2) {
          rows.push(bodiesInSign.slice(b, b + 2));
        }
        const lineHeight = 24;
        const startY = bodyCenterY - ((rows.length - 1) * lineHeight) / 2;

        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        rows.forEach((row, rIdx) => {
          const rowY = startY + rIdx * lineHeight;
          const labels = row.map((body) => {
            const lbl = bodyLabel(body);
            return body.name === 'Ascendant' ? 'Asc' : lbl;
          });
          const rowText = labels.join('  ');

          ctx.fillStyle = '#ffffff';
          ctx.fillText(rowText, bodyCenterX, rowY);
        });
      }
    });

    // Center 2x2 box title
    const centerLeft = chartLeft + cell;
    const centerTop = chartTop + cell;
    const centerSize = cell * 2;
    ctx.fillStyle = '#0d0f28';
    ctx.fillRect(centerLeft, centerTop, centerSize, centerSize);
    ctx.strokeStyle = '#e2b857';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(centerLeft, centerTop, centerSize, centerSize);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillStyle = '#e2b857';
    ctx.fillText(displayName, centerLeft + centerSize / 2, centerTop + centerSize / 2 - 16);

    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#a8abc4';
    ctx.fillText(`${divisionName} · ${division}`, centerLeft + centerSize / 2, centerTop + centerSize / 2 + 16);

    // Outer chart border
    ctx.strokeStyle = '#e2b857';
    ctx.lineWidth = 3;
    ctx.strokeRect(chartLeft, chartTop, chartSize, chartSize);
  }

  // 5. Key Astrological Metrics Section (Below Chart)
  const summaryTop = chartTop + chartSize + 24;
  const colWidth = (chartSize - 32) / 3;

  const summaryItems = [
    {
      title: 'LAGNA (ASCENDANT)',
      value: ascendant.sign,
      sub: `${ascendant.nakshatra} · pada ${ascendant.pada}`,
    },
    {
      title: 'CHANDRA (MOON SIGN)',
      value: moon?.sign || '—',
      sub: moon ? `${moon.nakshatra} · pada ${moon.pada}` : '',
    },
    {
      title: 'SURYA (SUN SIGN)',
      value: sun?.sign || '—',
      sub: sun ? `${formatDegrees(sun.degreeInSign)} in ${sun.sign}` : '',
    },
  ];

  summaryItems.forEach((item, idx) => {
    const cardX = chartLeft + idx * (colWidth + 16);
    ctx.fillStyle = 'rgba(20, 24, 62, 0.7)';
    ctx.strokeStyle = '#433418';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(cardX, summaryTop, colWidth, 90, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#c9a552';
    ctx.fillText(item.title, cardX + colWidth / 2, summaryTop + 14);

    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(item.value, cardX + colWidth / 2, summaryTop + 33);

    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#9aa0be';
    ctx.fillText(item.sub, cardX + colWidth / 2, summaryTop + 62);
  });

  // 6. Comprehensive Planetary Positions Summary Strip
  const planetStripTop = summaryTop + 104;
  ctx.fillStyle = 'rgba(12, 14, 38, 0.8)';
  ctx.strokeStyle = '#2b2311';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(chartLeft, planetStripTop, chartSize, 56, 8);
  ctx.fill();
  ctx.stroke();

  // Draw list of major grahas with degrees
  const grahaNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const grahaParts = grahaNames.map((name) => {
    const pos = chart.planets.find((p) => p.name === name);
    if (!pos) return '';
    const abbr = bodyLabel(pos);
    const deg = Math.floor(pos.degreeInSign);
    return `${abbr}:${pos.sign.slice(0, 3)} ${deg}°`;
  }).filter(Boolean);

  ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#c7cadf';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(grahaParts.join('  ·  '), chartLeft + chartSize / 2, planetStripTop + 28);

  // 7. Footer Information & Watermark
  const footerTop = height - 58;
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#787c9b';
  ctx.textAlign = 'left';
  const ayanamsaText = `Ayanamsa: ${AYANAMSA_LABEL[b.ayanamsa]} (${b.ayanamsaDegrees.toFixed(2)}°) · Whole Sign Houses`;
  ctx.fillText(ayanamsaText, chartLeft, footerTop);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#a88a44';
  ctx.fillText('NextGenAstro · Certified Vedic Calculations', chartLeft + chartSize, footerTop);

  // 8. Convert to Blob and Trigger Download
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate PNG blob.'));
        return;
      }
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const cleanName = (b.name || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        link.download = `nextgenastro-${cleanName}-${division.toLowerCase()}-${b.date}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}
